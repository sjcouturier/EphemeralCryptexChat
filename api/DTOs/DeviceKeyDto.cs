namespace EphemeralCryptexChat.Api.DTOs;

public record DeviceKeyDto(string DeviceId, string PublicKeyJwk, DateTime RegisteredAt, DateTime LastSeenAt);
