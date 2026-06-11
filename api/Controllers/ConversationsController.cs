using EphemeralCryptexChat.Api.DTOs;
using EphemeralCryptexChat.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EphemeralCryptexChat.Api.Controllers;

[Authorize]
public class ConversationsController : ApiControllerBase
{
    private readonly IConversationService _conversationService;

    public ConversationsController(IConversationService conversationService)
    {
        _conversationService = conversationService;
    }

    /// <summary>All channels the current user participates in.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ConversationDto>>> GetAll()
    {
        var conversations = await _conversationService.GetConversationsForUserAsync(CurrentUserId);
        return Ok(conversations);
    }

    /// <summary>A single channel by id.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ConversationDto>> Get(int id)
    {
        try
        {
            var conversation = await _conversationService.GetConversationAsync(id, CurrentUserId);
            return conversation is null ? NotFound() : conversation;
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    /// <summary>Opens a new channel with another user by GitHub login.</summary>
    [HttpPost]
    public async Task<ActionResult<ConversationDto>> Start([FromBody] StartConversationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ResponderLogin))
        {
            return BadRequest("ResponderLogin is required.");
        }

        try
        {
            var conversation = await _conversationService.StartConversationAsync(CurrentUserId, dto.ResponderLogin);
            return CreatedAtAction(nameof(Get), new { id = conversation.Id }, conversation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
