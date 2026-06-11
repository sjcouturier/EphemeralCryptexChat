using EphemeralCryptexChat.Api.DTOs;

namespace EphemeralCryptexChat.Api.Hubs;

/// <summary>Strongly-typed contract of events the server pushes to clients.</summary>
public interface IChatClient
{
    Task ReceiveMessage(MessageDto message);
    Task MessageRead(int messageId, int conversationId);
    Task ConversationUpdated(ConversationDto conversation);
    Task UserOnline(int userId);
    Task UserOffline(int userId);
}
