using EphemeralCryptexChat.Api.DTOs;
using EphemeralCryptexChat.Api.Models;

namespace EphemeralCryptexChat.Api.Services;

public static class DtoMapper
{
    public static UserDto ToDto(this User user) =>
        new(user.Id, user.GitHubLogin, user.AvatarUrl);

    public static MessageDto ToDto(this Message m) =>
        new(
            m.Id,
            m.ConversationId,
            m.SenderId,
            m.Sender?.GitHubLogin ?? string.Empty,
            m.CiphertextBase64,
            m.IvBase64,
            m.Status,
            m.SentAt,
            m.ExpiresAt,
            m.RevealDurationMs,
            m.ReadDurationMs,
            m.ScrambleDurationMs,
            m.Sensitivity);

    public static ConversationDto ToDto(this Conversation c, Message? pending) =>
        new(
            c.Id,
            c.Initiator.ToDto(),
            c.Responder.ToDto(),
            c.Status,
            c.CurrentTurnUserId,
            c.LastActivityAt,
            pending?.ToDto());
}
