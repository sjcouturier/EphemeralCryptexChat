using EphemeralCryptexChat.Api.DTOs;

namespace EphemeralCryptexChat.Api.Services.Interfaces;

public interface IMessageService
{
    Task<MessageDto> SendMessageAsync(SendMessageDto dto, int senderId);

    /// <summary>Marks a pending message as delivered to the recipient.</summary>
    Task<MessageDto?> AcknowledgeDeliveryAsync(int messageId, int recipientId);

    /// <summary>Marks a message as read and shortens its expiry to now + 5 minutes.</summary>
    Task<MessageDto?> AcknowledgeReadAsync(int messageId, int recipientId);

    Task<MessageDto?> GetMessageAsync(int messageId, int requestingUserId);
}
