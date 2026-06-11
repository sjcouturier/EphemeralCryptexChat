using EphemeralCryptexChat.Api.Models;

namespace EphemeralCryptexChat.Api.DTOs;

public record MessageDto(
    int Id,
    int ConversationId,
    int SenderId,
    string SenderLogin,
    string CiphertextBase64,
    string IvBase64,
    MessageStatus Status,
    DateTime SentAt,
    DateTime ExpiresAt,
    int RevealDurationMs,
    int ReadDurationMs,
    int ScrambleDurationMs,
    MessageSensitivity Sensitivity
);
