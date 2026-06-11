namespace EphemeralCryptexChat.Api.Models;

/// <summary>
/// The server only ever stores encrypted ciphertext. It can never read message contents.
/// </summary>
public class Message
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;
    public int SenderId { get; set; }
    public User Sender { get; set; } = null!;

    /// <summary>AES-GCM ciphertext, base64 encoded.</summary>
    public string CiphertextBase64 { get; set; } = string.Empty;

    /// <summary>AES-GCM initialization vector, base64 encoded.</summary>
    public string IvBase64 { get; set; } = string.Empty;

    public MessageStatus Status { get; set; } = MessageStatus.Pending;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    /// <summary>SentAt + TTL (default 24h), or shortened to 5 minutes once read.</summary>
    public DateTime ExpiresAt { get; set; }

    // Sender's animation settings (cosmetic only, never encrypted).
    public int RevealDurationMs { get; set; } = 400;
    public int ReadDurationMs { get; set; } = 3000;
    public int ScrambleDurationMs { get; set; } = 400;
    public MessageSensitivity Sensitivity { get; set; } = MessageSensitivity.Standard;
}

public enum MessageStatus
{
    Pending,
    Delivered,
    Read,
    Expired
}

public enum MessageSensitivity
{
    Standard,
    PressAndHold
}
