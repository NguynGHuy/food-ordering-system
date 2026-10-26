using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

// Default is read-only preview. --apply changes ONLY matched demo image columns.
var apply = args.Contains("--apply");
var cursor = new DirectoryInfo(AppContext.BaseDirectory);
while (cursor != null && !File.Exists(Path.Combine(cursor.FullName, "DatMonAnOnline.API/Database/SeedDemo.sql"))) cursor = cursor.Parent;
var root = cursor?.FullName ?? throw new InvalidOperationException("Repository root missing");
var apiRoot = Path.Combine(root, "DatMonAnOnline.API");
var sql = File.ReadAllText(Path.Combine(apiRoot, "Database/SeedDemo.sql"));
var manifest = JsonSerializer.Deserialize<List<Asset>>(File.ReadAllText(Path.Combine(root, "scripts/demo-images/manifest.json")), new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
var restaurants = SeedRows("nhahang");
var foods = SeedRows("monan");
if (restaurants.Count != 10 || foods.Count != 124 || manifest.Count != 134) throw new InvalidOperationException("Unexpected demo catalog");
foreach (var asset in manifest)
{
    if (!Regex.IsMatch(asset.Path, "^/uploads/(foods|restaurants)/demo-v1-[0-9]+-[a-z0-9-]+[.]webp$")) throw new InvalidOperationException("Unexpected asset path");
    var file = Path.Combine(apiRoot, "wwwroot", asset.Path.TrimStart('/'));
    if (!File.Exists(file) || !Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file))).Equals(asset.Sha256, StringComparison.OrdinalIgnoreCase))
        throw new InvalidOperationException("Asset missing or checksum mismatch: " + asset.Path);
}
var config = new ConfigurationBuilder().SetBasePath(apiRoot)
    .AddJsonFile("appsettings.json", optional: false)
    .AddJsonFile("appsettings.Development.json", optional: true)
    .AddUserSecrets("DatMonAnOnline.API-LocalDevelopment")
    .AddEnvironmentVariables().Build();
var connection = new MySqlConnectionStringBuilder(config.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Missing local database configuration"));
if (!(new[] { "localhost", "127.0.0.1", "::1" }).Contains(connection.Server, StringComparer.OrdinalIgnoreCase)
    || !connection.Database.Equals("DatMonAnOnline", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("Only the configured LOCAL DatMonAnOnline demo database is allowed");
connection.ConnectionTimeout = 5;
connection.DefaultCommandTimeout = 15;
try
{
    await using var db = new MySqlConnection(connection.ConnectionString);
    await db.OpenAsync();
    await using var transaction = await db.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead);
    var lockSql = apply ? " FOR UPDATE" : "";
    var currentRestaurants = new List<Restaurant>();
    await using (var command = new MySqlCommand("SELECT MaNhaHang, TenNhaHang, AnhBia FROM nhahang ORDER BY MaNhaHang" + lockSql, db, transaction))
    await using (var reader = await command.ExecuteReaderAsync())
        while (await reader.ReadAsync()) currentRestaurants.Add(new(reader.GetInt32(0), reader.GetString(1), reader.IsDBNull(2) ? null : reader.GetString(2)));
    var matches = new Dictionary<int, Restaurant>();
    foreach (var row in restaurants)
    {
        var candidates = currentRestaurants.Where(r => r.Name == row[2]).ToArray();
        if (candidates.Length != 1) throw new InvalidOperationException($"Expected one restaurant named {row[2]}, found {candidates.Length}. No update.");
        matches.Add(int.Parse(row[0]!), candidates[0]);
    }
    var currentFoods = new List<Food>();
    await using (var command = new MySqlCommand("SELECT MaMonAn, MaNhaHang, TenMonAn, HinhAnh FROM monan WHERE MaNhaHang IN (" + string.Join(',', matches.Values.Select((_, i) => "@r" + i)) + ") ORDER BY MaMonAn" + lockSql, db, transaction))
    {
        var index = 0;
        foreach (var restaurant in matches.Values) command.Parameters.AddWithValue("@r" + index++, restaurant.Id);
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) currentFoods.Add(new(reader.GetInt32(0), reader.GetInt32(1), reader.GetString(2), reader.IsDBNull(3) ? null : reader.GetString(3)));
    }
    var changes = new List<Change>();
    var skipped = new List<string>();
    var alreadyAttached = 0;
    var oldDemoCovers = new HashSet<string>(StringComparer.Ordinal) {
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=700&fit=crop",
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=700&fit=crop",
        "https://images.unsplash.com/photo-1579751626657-72bc17010498?w=1200&h=700&fit=crop"
    };
    foreach (var row in restaurants)
    {
        var restaurant = matches[int.Parse(row[0]!)];
        Plan("nhahang", restaurant.Id, restaurant.Name, restaurant.Image, manifest.Single(a => a.Kind == "restaurants" && a.Id == int.Parse(row[0]!)), true);
    }
    foreach (var row in foods)
    {
        var restaurant = matches[int.Parse(row[1]!)];
        var candidates = currentFoods.Where(f => f.RestaurantId == restaurant.Id && f.Name == row[3]).ToArray();
        if (candidates.Length != 1) throw new InvalidOperationException($"Expected one food named {row[3]} in {restaurant.Name}, found {candidates.Length}. No update.");
        var food = candidates[0];
        Plan("monan", food.Id, food.Name, food.Image, manifest.Single(a => a.Kind == "foods" && a.Id == int.Parse(row[0]!)), false);
    }
    Console.WriteLine($"LOCAL database matched: {matches.Count} restaurants, {foods.Count} foods. Images already attached: {alreadyAttached}; planned: {changes.Count}; custom images preserved: {skipped.Count}.");
    foreach (var item in skipped) Console.WriteLine("Preserved: " + item);
    if (!apply || changes.Count == 0)
    {
        await transaction.RollbackAsync();
        Console.WriteLine(apply ? "PASS: no duplicate update required." : "PREVIEW only: no database changes. Use --apply for this exact scope.");
        return;
    }
    var backupDirectory = Path.Combine(root, ".build-check/demo-image-attachments");
    Directory.CreateDirectory(backupDirectory);
    var backup = Path.Combine(backupDirectory, DateTime.UtcNow.ToString("yyyyMMddTHHmmssfffffff") + ".json");
    // Contains only image fields + row IDs/names. No credentials, accounts or financial data.
    await using (var output = new FileStream(backup, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        await JsonSerializer.SerializeAsync(output, changes, new JsonSerializerOptions { WriteIndented = true });
    foreach (var change in changes)
    {
        var restaurant = change.Table == "nhahang";
        var column = restaurant ? "AnhBia" : "HinhAnh";
        var id = restaurant ? "MaNhaHang" : "MaMonAn";
        await using var update = new MySqlCommand($"UPDATE {change.Table} SET {column}=@new WHERE {id}=@id AND {column} <=> @old", db, transaction);
        update.Parameters.AddWithValue("@new", change.NewImage);
        update.Parameters.AddWithValue("@id", change.Id);
        update.Parameters.AddWithValue("@old", (object?)change.OldImage ?? DBNull.Value);
        if (await update.ExecuteNonQueryAsync() != 1) throw new InvalidOperationException("Image changed concurrently; rolling back all updates");
    }
    await transaction.CommitAsync();
    Console.WriteLine($"COMMITTED: {changes.Count(c => c.Table == "nhahang")} restaurant covers, {changes.Count(c => c.Table == "monan")} food images. Backup: .build-check/demo-image-attachments/{Path.GetFileName(backup)}");

    void Plan(string table, int id, string name, string? old, Asset asset, bool restaurant)
    {
        if (asset.Name != name) throw new InvalidOperationException("Manifest name mismatch");
        if (old == asset.Path) { alreadyAttached++; return; }
        // Only blank images and the verified original demo covers are replaced.
        if (!string.IsNullOrWhiteSpace(old) && !(restaurant && oldDemoCovers.Contains(old))) { skipped.Add(table + ": " + name); return; }
        changes.Add(new(table, id, name, old, asset.Path));
    }
}
catch (MySqlException error)
{
    Console.Error.WriteLine($"MySQL operation failed (error {error.Number}); no credentials printed. Any uncommitted changes are rolled back.");
    Environment.ExitCode = 1;
}

List<string?[]> SeedRows(string table)
{
    var block = Regex.Match(sql, "INSERT INTO `" + table + "`[^;]*?\\bVALUES\\s*([\\s\\S]*?);");
    if (!block.Success) throw new InvalidOperationException("Missing seed table: " + table);
    return Regex.Matches(block.Groups[1].Value, "\\(([^\\r\\n]*)\\)").Select(row =>
        Regex.Matches(row.Groups[1].Value, "'(?:[^']|'')*'|[^,]+").Select(token => {
            var value = token.Value.Trim();
            return value == "NULL" ? null : value.StartsWith('\'') ? value[1..^1].Replace("''", "'") : value;
        }).ToArray()).ToList();
}

record Asset(string Kind, int Id, string Name, string Path, string Sha256);
record Restaurant(int Id, string Name, string? Image);
record Food(int Id, int RestaurantId, string Name, string? Image);
record Change(string Table, int Id, string Name, string? OldImage, string NewImage);
