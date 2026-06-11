namespace EphemeralCryptexChat.Api.Models;

public class Conversation
{
    public int Id { get; set; }
    public int InitiatorId { get; set; }
    public User Initiator { get; set; } = null!;
    public int ResponderId { get; set; }
    public User Responder { get; set; } = null!;
    public ConversationStatus Status { get; set; } = ConversationStatus.Active;

    /// <summary>Whose turn it is to transmit the next message.</summary>
    public int? CurrentTurnUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

    public ICollection<Message> Messages { get; set; } = new List<Message>();
}

public enum ConversationStatus
{
    Active,
    Closed
}
