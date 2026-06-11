using EphemeralCryptexChat.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EphemeralCryptexChat.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<CryptoKeyRecord> CryptoKeys => Set<CryptoKeyRecord>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.GitHubId).IsUnique();
            entity.HasIndex(u => u.GitHubLogin);
            entity.Property(u => u.GitHubId).IsRequired();
            entity.Property(u => u.GitHubLogin).IsRequired();
        });

        modelBuilder.Entity<CryptoKeyRecord>(entity =>
        {
            entity.HasIndex(k => new { k.UserId, k.DeviceId }).IsUnique();
            entity.HasOne(k => k.User)
                .WithMany(u => u.CryptoKeys)
                .HasForeignKey(k => k.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasOne(c => c.Initiator)
                .WithMany(u => u.InitiatedConversations)
                .HasForeignKey(c => c.InitiatorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(c => c.Responder)
                .WithMany(u => u.ReceivedConversations)
                .HasForeignKey(c => c.ResponderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(c => new { c.InitiatorId, c.ResponderId });
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasOne(m => m.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(m => m.ExpiresAt);
            entity.HasIndex(m => m.ConversationId);
        });
    }
}
