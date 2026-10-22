using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DatMonAnOnline.API.Services;

// Idempotency - thông tin của request sau khi kiểm tra
public sealed record IdempotencyCheck(
    string ScopeHash,
    string Key,
    string RequestHash,
    IActionResult? Result);

// Idempotency - lưu và trả lại kết quả thành công
public static class IdempotencyStore
{
    public static readonly TimeSpan Retention = TimeSpan.FromHours(48);

    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private static string Hash(string value)
    {
        return Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    }

    private static ContentResult JsonResult(string json, int statusCode)
    {
        return new ContentResult
        {
            StatusCode = statusCode,
            ContentType = "application/json; charset=utf-8",
            Content = json
        };
    }

    // Gọi sau khi đã khóa dòng nhà hàng trong transaction.
    public static async Task<IdempotencyCheck> CheckAsync(
        DatMonAnOnlineContext context,
        HttpRequest request,
        int maTaiKhoan,
        object payload)
    {
        if (context.Database.CurrentTransaction == null)
            throw new InvalidOperationException(
                "Idempotency phải chạy trong transaction.");

        var header = request.Headers["Idempotency-Key"];

        if (header.Count != 1 ||
            !Guid.TryParseExact(header.ToString(), "D", out var parsedKey))
        {
            return new IdempotencyCheck(
                "", "", "",
                new BadRequestObjectResult(new
                {
                    message = "Idempotency-Key phải là một UUID hợp lệ."
                }));
        }

        var key = parsedKey.ToString("D");

        var scopeHash = Hash(
            $"{maTaiKhoan}|{request.Method}|{request.Path}");

        var payloadJson = JsonSerializer.Serialize(
            payload,
            payload.GetType(),
            JsonOptions);

        var requestHash = Hash(payloadJson);

        // Một key hết hạn được phép dùng lại. Xóa bản ghi cũ trong chính
        // transaction hiện tại để unique index không chặn lần ghi mới.
        await context.Database.ExecuteSqlInterpolatedAsync(
            $@"DELETE FROM idempotencyrequest
               WHERE ScopeHash = {scopeHash}
                 AND IdempotencyKey = {key}
                 AND ExpiresAt <= {DateTime.UtcNow}");

        var connection = context.Database.GetDbConnection();

        await using var command = connection.CreateCommand();

        command.Transaction =
            context.Database.CurrentTransaction.GetDbTransaction();

        // Đọc hiện tại sau khóa nhà hàng, không dùng snapshot cũ.
        command.CommandText = """
            SELECT RequestHash, ResponseJson, StatusCode
            FROM idempotencyrequest
            WHERE ScopeHash = @scope
              AND IdempotencyKey = @key
            FOR UPDATE
            """;

        var scopeParameter = command.CreateParameter();
        scopeParameter.ParameterName = "@scope";
        scopeParameter.DbType = DbType.String;
        scopeParameter.Value = scopeHash;
        command.Parameters.Add(scopeParameter);

        var keyParameter = command.CreateParameter();
        keyParameter.ParameterName = "@key";
        keyParameter.DbType = DbType.String;
        keyParameter.Value = key;
        command.Parameters.Add(keyParameter);

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return new IdempotencyCheck(
                scopeHash, key, requestHash, null);
        }

        if (!string.Equals(
            reader.GetString(0),
            requestHash,
            StringComparison.Ordinal))
        {
            return new IdempotencyCheck(
                scopeHash, key, requestHash,
                new ConflictObjectResult(new
                {
                    message =
                        "Idempotency-Key đã được dùng với dữ liệu khác."
                }));
        }

        return new IdempotencyCheck(
            scopeHash,
            key,
            requestHash,
            JsonResult(
                reader.GetString(1),
                Convert.ToInt32(reader.GetValue(2))));
    }

    // Gọi trước CommitAsync, cùng transaction với nghiệp vụ.
    public static async Task<IActionResult> SaveSuccessAsync(
        DatMonAnOnlineContext context,
        IdempotencyCheck check,
        object response,
        int statusCode = StatusCodes.Status200OK)
    {
        if (context.Database.CurrentTransaction == null ||
            check.Result != null)
        {
            throw new InvalidOperationException(
                "Không thể lưu kết quả idempotency.");
        }

        if (statusCode < StatusCodes.Status200OK ||
            statusCode >= StatusCodes.Status300MultipleChoices)
        {
            throw new ArgumentOutOfRangeException(
                nameof(statusCode),
                "Idempotency chỉ lưu response thành công (2xx).");
        }

        var json = JsonSerializer.Serialize(
            response,
            response.GetType(),
            JsonOptions);

        await context.Database.ExecuteSqlInterpolatedAsync(
            $@"INSERT INTO idempotencyrequest
               (ScopeHash, IdempotencyKey, RequestHash, ResponseJson,
                StatusCode, ExpiresAt)
               VALUES
               ({check.ScopeHash}, {check.Key}, {check.RequestHash}, {json},
                {statusCode},
                {DateTime.UtcNow.Add(Retention)})");

        return JsonResult(json, statusCode);
    }
}
