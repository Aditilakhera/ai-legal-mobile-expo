/**
 * AI Legal Mobile - API Endpoint Constants
 * Map directly to existing Express backend routers.
 */

export const API_ENDPOINTS = {
  // Authentication
  Auth: {
    Login: '/auth/login',
    Signup: '/auth/signup',
    VerifyEmail: '/auth/verify-email',
    ResendCode: '/auth/resend-code',
    ForgotPassword: '/auth/forgot-password',
    ResetPasswordOtp: '/auth/reset-password-otp',
    ResetPasswordEmail: '/auth/reset-password-email',
    SocialLogin: '/auth/social-login',
    AppleLogin: '/auth/apple',
    GoogleLogin: '/auth/google',
    MicrosoftLogin: '/auth/microsoft',
    SsoGenerate: '/auth/sso/generate',
    SsoHandoff: '/auth/sso/handoff',
  },

  // User Profile
  User: {
    Profile: '/user',
    UpdateProfile: '/user/profile',
    Avatar: '/user/avatar',
    Sessions: '/user/sessions',
    DeleteAccount: '/user',
    DataDeletion: '/user/data',
    DataExport: '/user/data/export',
    Payments: '/user/payments',
  },

  // Case Workspaces (mapped as project endpoints in backend)
  Cases: {
    Base: '/projects',
    Details: (id: string) => `/projects/${id}` as const,
    Documents: (id: string) => `/projects/${id}/documents` as const,
    Evidence: (id: string) => `/projects/${id}/evidence` as const,
    Tasks: (id: string) => `/projects/${id}/tasks` as const,
    Research: (id: string) => `/projects/${id}/research` as const,
    ClientConnectDraft: (id: string) => `/projects/${id}/client-connect/draft` as const,
    ClientConnectLog: (id: string) => `/projects/${id}/client-connect/log` as const,
    ClientConnectLogs: (id: string) => `/projects/${id}/client-connect/logs` as const,
    ClientConnectLogItem: (id: string, logId: string) => `/projects/${id}/client-connect/logs/${logId}` as const,
  },

  // Chat Sessions
  Chat: {
    Sessions: '/chat',
    SessionDetails: (sessionId: string) => `/chat/${sessionId}` as const,
    Execute: '/chat',
    ShareEmail: (sessionId: string) => `/chat/${sessionId}/share/email` as const,
  },

  // Legal AI Toolkit
  LegalToolkit: {
    Execute: '/legal-toolkit/execute',
  },

  // Subscription & Credits
  Subscription: {
    Status: '/subscription/status',
    UserCredits: '/subscription/user-credits',
    CreditHistory: '/subscription/credit-history',
    PurchasePlan: '/subscription/purchase-plan',
    VerifyPayment: '/subscription/verify-payment',
  },

  // Specialized Agents
  Agents: {
    List: '/agents',
    MyAgents: '/agents/get_my_agents',
    Buy: '/agents/buy',
  },

  // Miscellaneous
  Notifications: '/notifications',
  Support: '/support',
  Feedback: '/feedback',
  Precedents: '/precedents',

  // Voice & Speech Recognition
  Voice: {
    Transcribe: '/voice/transcribe',
  },

  // Mock Courtroom
  MockCourtroom: {
    Respond: '/projects/mock-courtroom/respond',
    Report: '/projects/mock-courtroom/report',
    PracticeReport: '/projects/mock-courtroom/practice-report',
  },
} as const;
