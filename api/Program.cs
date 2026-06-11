using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using EphemeralCryptexChat.Api.Controllers;
using EphemeralCryptexChat.Api.Data;
using EphemeralCryptexChat.Api.Hubs;
using EphemeralCryptexChat.Api.Services;
using EphemeralCryptexChat.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(config.GetConnectionString("DefaultConnection")
                      ?? "Data Source=ephemeral_cryptex.db"));

// ---------------------------------------------------------------------------
// Application services
// ---------------------------------------------------------------------------
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IConversationService, ConversationService>();
builder.Services.AddScoped<IMessageService, MessageService>();
builder.Services.AddSingleton<ITokenService, TokenService>();

// TTL cleanup runs as a hosted service but is also resolvable via its interface.
builder.Services.AddSingleton<TtlCleanupService>();
builder.Services.AddSingleton<ITtlCleanupService>(sp => sp.GetRequiredService<TtlCleanupService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<TtlCleanupService>());

// ---------------------------------------------------------------------------
// SignalR
// ---------------------------------------------------------------------------
builder.Services.AddSignalR();
builder.Services.AddSingleton<IUserIdProvider, SubClaimUserIdProvider>();

// ---------------------------------------------------------------------------
// Authentication: JWT (API) + Cookie (OAuth handshake) + GitHub OAuth
// ---------------------------------------------------------------------------
var jwtKey = config["Jwt:Key"] ?? "DEVELOPMENT_ONLY_INSECURE_KEY_REPLACE_ME_32+";
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // keep "sub" claim verbatim
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = config["Jwt:Issuer"],
            ValidAudience = config["Jwt:Audience"],
            IssuerSigningKey = signingKey,
            NameClaimType = "login",
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        // SignalR transmits the JWT via the access_token query-string parameter.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    })
    .AddCookie(AuthController.ExternalScheme, options =>
    {
        options.Cookie.SameSite = SameSiteMode.None;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.HttpOnly = true;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(10);
    })
    .AddOAuth(AuthController.GitHubScheme, options =>
    {
        options.SignInScheme = AuthController.ExternalScheme;
        options.ClientId = config["GitHub:ClientId"] ?? "GITHUB_CLIENT_ID";
        options.ClientSecret = config["GitHub:ClientSecret"] ?? "GITHUB_CLIENT_SECRET";
        options.CallbackPath = "/signin-github";

        options.AuthorizationEndpoint = "https://github.com/login/oauth/authorize";
        options.TokenEndpoint = "https://github.com/login/oauth/access_token";
        options.UserInformationEndpoint = "https://api.github.com/user";

        options.Scope.Add("read:user");
        options.SaveTokens = true;

        options.ClaimActions.MapJsonKey(ClaimTypes.NameIdentifier, "id");
        options.ClaimActions.MapJsonKey(ClaimTypes.Name, "login");
        options.ClaimActions.MapJsonKey("github:login", "login");
        options.ClaimActions.MapJsonKey("github:avatar", "avatar_url");

        options.Events = new OAuthEvents
        {
            OnCreatingTicket = async context =>
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, context.Options.UserInformationEndpoint);
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", context.AccessToken);
                request.Headers.UserAgent.ParseAdd("EphemeralCryptexChat");

                using var response = await context.Backchannel.SendAsync(
                    request, HttpCompletionOption.ResponseHeadersRead, context.HttpContext.RequestAborted);
                response.EnsureSuccessStatusCode();

                using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                context.RunClaimActions(json.RootElement);
            }
        };
    });

builder.Services.AddAuthorization();

// ---------------------------------------------------------------------------
// CORS — allow the Angular dev server and the GitHub Pages origin
// ---------------------------------------------------------------------------
const string CorsPolicy = "CryptexCors";
var allowedOrigins = config.GetSection("AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:4200" };

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

// ---------------------------------------------------------------------------
// MVC + OpenAPI
// ---------------------------------------------------------------------------
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// Apply migrations / create the database on startup.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.Run();
