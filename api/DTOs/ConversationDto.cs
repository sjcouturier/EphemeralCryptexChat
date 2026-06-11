using EphemeralCryptexChat.Api.Models;

namespace EphemeralCryptexChat.Api.DTOs;

public record ConversationDto(
    int Id,
    UserDto Initiator,
    UserDto Responder,
    ConversationStatus Status,
    int? CurrentTurnUserId,
    DateTime LastActivityAt,
    MessageDto? PendingMessage
);
