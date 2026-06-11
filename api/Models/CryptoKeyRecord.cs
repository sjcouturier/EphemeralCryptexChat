namespace EphemeralCryptexChat.Api.Models;

/// <summary>
/// Stores a user's ECDH public key per device. Private keys never leave the browser.
/// </summary>
public class CryptoKeyRecord
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Browser-generated UUID identifying the device.</summary>
    public string DeviceId { get; set; } = string.Empty;

    /// <summary>ECDH public key serialized as JWK JSON.</summary>
    public string PublicKeyJwk { get; set; } = string.Empty;

    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
}
