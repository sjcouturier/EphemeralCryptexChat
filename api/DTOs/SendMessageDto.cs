using EphemeralCryptexChat.Api.Models;

namespace EphemeralCryptexChat.Api.DTOs;

public record SendMessageDto(
    int ConversationId,
    string CiphertextBase64,
    string IvBase64,
    int RevealDurationMs,
    int ReadDurationMs,
    int ScrambleDurationMs,
    MessageSensitivity Sensitivity
);
