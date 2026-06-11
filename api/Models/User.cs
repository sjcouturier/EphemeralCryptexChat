namespace EphemeralCryptexChat.Api.Models;

public class User
{
    public int Id { get; set; }
    public string GitHubId { get; set; } = string.Empty;
    public string GitHubLogin { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CryptoKeyRecord> CryptoKeys { get; set; } = new List<CryptoKeyRecord>();
    public ICollection<Conversation> InitiatedConversations { get; set; } = new List<Conversation>();
    public ICollection<Conversation> ReceivedConversations { get; set; } = new List<Conversation>();
}
