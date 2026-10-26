using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Mail;
using System.Threading.Channels;

namespace DatMonAnOnline.API.Services;

public sealed class SmtpEmailOptions
{
    public const string SectionName = "Email:Smtp";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "Đặt Món Ăn";

    public bool IsValid()
        => !string.IsNullOrWhiteSpace(Host) &&
           Port is > 0 and <= 65535 &&
           !string.IsNullOrWhiteSpace(FromAddress);
}

public interface IPasswordResetEmailSender
{
    Task SendAsync(
        string recipientEmail,
        string confirmationCode,
        int expiresAfterMinutes,
        CancellationToken cancellationToken = default);
}

public sealed class SmtpPasswordResetEmailSender : IPasswordResetEmailSender
{
    private readonly SmtpEmailOptions _options;

    public SmtpPasswordResetEmailSender(IOptions<SmtpEmailOptions> options)
    {
        _options = options.Value;
    }

    public async Task SendAsync(
        string recipientEmail,
        string confirmationCode,
        int expiresAfterMinutes,
        CancellationToken cancellationToken = default)
    {
        if (!_options.IsValid())
            throw new InvalidOperationException("Cấu hình SMTP chưa đầy đủ.");

        cancellationToken.ThrowIfCancellationRequested();

        using var message = new MailMessage
        {
            From = new MailAddress(_options.FromAddress, _options.FromName),
            Subject = "Mã xác nhận đặt lại mật khẩu",
            Body = $"Mã xác nhận của bạn là: {confirmationCode}\n\n" +
                   $"Mã có hiệu lực trong {expiresAfterMinutes} phút. " +
                   "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.",
            IsBodyHtml = false
        };
        message.To.Add(new MailAddress(recipientEmail));

        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            EnableSsl = _options.EnableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false
        };

        if (!string.IsNullOrWhiteSpace(_options.UserName))
            client.Credentials = new NetworkCredential(_options.UserName, _options.Password);

        await client.SendMailAsync(message, cancellationToken);
    }
}

public sealed record PasswordResetEmail(
    string RecipientEmail,
    string ConfirmationCode,
    int ExpiresAfterMinutes)
{
    public DateTime ExpiresAtUtc { get; init; } = DateTime.UtcNow.AddMinutes(ExpiresAfterMinutes);
}

public interface IPasswordResetEmailQueue
{
    bool IsAvailable { get; }
    bool TryQueue(PasswordResetEmail email);
}

public sealed class PasswordResetEmailQueue : BackgroundService, IPasswordResetEmailQueue
{
    private readonly Channel<PasswordResetEmail> _channel =
        Channel.CreateBounded<PasswordResetEmail>(new BoundedChannelOptions(100)
        {
            SingleReader = true,
            SingleWriter = false,
            FullMode = BoundedChannelFullMode.Wait
        });

    private readonly IPasswordResetEmailSender _sender;
    private readonly ILogger<PasswordResetEmailQueue> _logger;
    private readonly SmtpEmailOptions _options;

    public PasswordResetEmailQueue(
        IPasswordResetEmailSender sender,
        ILogger<PasswordResetEmailQueue> logger,
        IOptions<SmtpEmailOptions> options)
    {
        _sender = sender;
        _logger = logger;
        _options = options.Value;
    }

    public bool IsAvailable => _options.IsValid();

    public bool TryQueue(PasswordResetEmail email)
        => IsAvailable && _channel.Writer.TryWrite(email);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var email in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            if (string.IsNullOrWhiteSpace(email.RecipientEmail)) continue;
            for (var attempt = 1; attempt <= 3 && !stoppingToken.IsCancellationRequested; attempt++)
            {
                var remaining = email.ExpiresAtUtc - DateTime.UtcNow;
                if (remaining <= TimeSpan.Zero) break;
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
                timeout.CancelAfter(remaining < TimeSpan.FromSeconds(10) ? remaining : TimeSpan.FromSeconds(10));
                try
                {
                    await _sender.SendAsync(email.RecipientEmail, email.ConfirmationCode,
                        Math.Max(1, (int)Math.Ceiling(remaining.TotalMinutes)), timeout.Token);
                    break;
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
                catch (Exception exception)
                {
                    // SMTP exceptions can contain recipients/server responses; don't log their payload.
                    _logger.LogWarning("Gửi email đặt lại mật khẩu thất bại, lần {Attempt}, loại {ErrorType}.",
                        attempt, exception.GetType().Name);
                    if (attempt < 3)
                    {
                        try { await Task.Delay(TimeSpan.FromSeconds(attempt), stoppingToken); }
                        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
                    }
                }
            }
        }
    }
}
