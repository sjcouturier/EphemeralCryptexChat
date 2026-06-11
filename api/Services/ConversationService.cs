using EphemeralCryptexChat.Api.Data;
using EphemeralCryptexChat.Api.DTOs;
using EphemeralCryptexChat.Api.Models;
using EphemeralCryptexChat.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EphemeralCryptexChat.Api.Services;

public class ConversationService : IConversationService
{
    private readonly AppDbContext _db;

    public ConversationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ConversationDto>> GetConversationsForUserAsync(int userId)
    {
        var conversations = await _db.Conversations
            .Include(c => c.Initiator)
            .Include(c => c.Responder)
            .Where(c => c.InitiatorId == userId || c.ResponderId == userId)
            .OrderByDescending(c => c.LastActivityAt)
            .ToListAsync();

        var result = new List<ConversationDto>();
        foreach (var c in conversations)
        {
            var pending = await GetPendingMessageAsync(c.Id);
            result.Add(c.ToDto(pending));
        }

        return result;
    }

    public async Task<ConversationDto?> GetConversationAsync(int id, int requestingUserId)
    {
        var conversation = await _db.Conversations
            .Include(c => c.Initiator)
            .Include(c => c.Responder)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (conversation is null)
        {
            return null;
        }

        if (conversation.InitiatorId != requestingUserId && conversation.ResponderId != requestingUserId)
        {
            throw new UnauthorizedAccessException("You are not a participant of this conversation.");
        }

        var pending = await GetPendingMessageAsync(conversation.Id);
        return conversation.ToDto(pending);
    }

    public async Task<ConversationDto> StartConversationAsync(int initiatorId, string responderLogin)
    {
        var responder = await _db.Users
            .FirstOrDefaultAsync(u => u.GitHubLogin.ToLower() == responderLogin.ToLower());

        if (responder is null)
        {
            throw new InvalidOperationException($"No user found with GitHub login '{responderLogin}'.");
        }

        if (responder.Id == initiatorId)
        {
            throw new InvalidOperationException("You cannot start a conversation with yourself.");
        }

        // Reuse an existing channel between these two users if one already exists.
        var existing = await _db.Conversations
            .Include(c => c.Initiator)
            .Include(c => c.Responder)
            .FirstOrDefaultAsync(c =>
                (c.InitiatorId == initiatorId && c.ResponderId == responder.Id) ||
                (c.InitiatorId == responder.Id && c.ResponderId == initiatorId));

        if (existing is not null)
        {
            var existingPending = await GetPendingMessageAsync(existing.Id);
            return existing.ToDto(existingPending);
        }

        var initiator = await _db.Users.FirstAsync(u => u.Id == initiatorId);

        var conversation = new Conversation
        {
            InitiatorId = initiatorId,
            ResponderId = responder.Id,
            Status = ConversationStatus.Active,
            CurrentTurnUserId = initiatorId, // Initiator transmits first.
            CreatedAt = DateTime.UtcNow,
            LastActivityAt = DateTime.UtcNow
        };

        _db.Conversations.Add(conversation);
        await _db.SaveChangesAsync();

        conversation.Initiator = initiator;
        conversation.Responder = responder;

        return conversation.ToDto(null);
    }

    public async Task UpdateTurnAsync(int conversationId, int newTurnUserId)
    {
        var conversation = await _db.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId);
        if (conversation is null)
        {
            return;
        }

        conversation.CurrentTurnUserId = newTurnUserId;
        conversation.LastActivityAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// The single "in play" message for a channel: the most recent message that
    /// has not yet been read or expired.
    /// </summary>
    private Task<Message?> GetPendingMessageAsync(int conversationId) =>
        _db.Messages
            .Include(m => m.Sender)
            .Where(m => m.ConversationId == conversationId &&
                        (m.Status == MessageStatus.Pending || m.Status == MessageStatus.Delivered))
            .OrderByDescending(m => m.Id)
            .FirstOrDefaultAsync();
}
