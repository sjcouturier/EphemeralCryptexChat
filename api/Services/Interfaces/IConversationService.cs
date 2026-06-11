using EphemeralCryptexChat.Api.DTOs;

namespace EphemeralCryptexChat.Api.Services.Interfaces;

public interface IConversationService
{
    Task<List<ConversationDto>> GetConversationsForUserAsync(int userId);
    Task<ConversationDto?> GetConversationAsync(int id, int requestingUserId);
    Task<ConversationDto> StartConversationAsync(int initiatorId, string responderLogin);
    Task UpdateTurnAsync(int conversationId, int newTurnUserId);
}
