using EphemeralCryptexChat.Api.DTOs;
using EphemeralCryptexChat.Api.Hubs;
using EphemeralCryptexChat.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace EphemeralCryptexChat.Api.Controllers;

[Authorize]
public class MessagesController : ApiControllerBase
{
    private readonly IMessageService _messageService;
    private readonly IConversationService _conversationService;
    private readonly IHubContext<ChatHub, IChatClient> _hub;

    public MessagesController(
        IMessageService messageService,
        IConversationService conversationService,
        IHubContext<ChatHub, IChatClient> hub)
    {
        _messageService = messageService;
        _conversationService = conversationService;
        _hub = hub;
    }

    /// <summary>REST fallback for transmitting a message; also pushes it over SignalR.</summary>
    [HttpPost]
    public async Task<ActionResult<MessageDto>> Send([FromBody] SendMessageDto dto)
    {
        try
        {
            var message = await _messageService.SendMessageAsync(dto, CurrentUserId);

            var conversation = await _conversationService.GetConversationAsync(dto.ConversationId, CurrentUserId);
            if (conversation is not null)
            {
                var recipientId = conversation.Initiator.Id == CurrentUserId
                    ? conversation.Responder.Id
                    : conversation.Initiator.Id;

                await _hub.Clients.User(recipientId.ToString()).ReceiveMessage(message);
                await _hub.Clients.Group(ChatHub.GroupName(dto.ConversationId)).ConversationUpdated(conversation);
            }

            return CreatedAtAction(nameof(Get), new { id = message.Id }, message);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Fetches a single message (its ciphertext) the caller is allowed to read.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<MessageDto>> Get(int id)
    {
        try
        {
            var message = await _messageService.GetMessageAsync(id, CurrentUserId);
            return message is null ? NotFound() : message;
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    /// <summary>Marks a message as delivered to this device.</summary>
    [HttpPost("{id:int}/delivered")]
    public async Task<ActionResult<MessageDto>> AcknowledgeDelivery(int id)
    {
        try
        {
            var message = await _messageService.AcknowledgeDeliveryAsync(id, CurrentUserId);
            if (message is null)
            {
                return NotFound();
            }

            var conversation = await _conversationService.GetConversationAsync(message.ConversationId, CurrentUserId);
            if (conversation is not null)
            {
                await _hub.Clients.Group(ChatHub.GroupName(message.ConversationId)).ConversationUpdated(conversation);
            }

            return message;
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    /// <summary>Marks a message as read: shortens expiry, flips the turn, notifies the sender.</summary>
    [HttpPost("{id:int}/read")]
    public async Task<ActionResult<MessageDto>> AcknowledgeRead(int id)
    {
        try
        {
            var message = await _messageService.AcknowledgeReadAsync(id, CurrentUserId);
            if (message is null)
            {
                return NotFound();
            }

            await _conversationService.UpdateTurnAsync(message.ConversationId, CurrentUserId);

            var group = ChatHub.GroupName(message.ConversationId);
            await _hub.Clients.Group(group).MessageRead(message.Id, message.ConversationId);

            var conversation = await _conversationService.GetConversationAsync(message.ConversationId, CurrentUserId);
            if (conversation is not null)
            {
                await _hub.Clients.Group(group).ConversationUpdated(conversation);
            }

            return message;
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}
