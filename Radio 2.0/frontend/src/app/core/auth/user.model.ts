export interface User {
  id: string;
  nickname: string;
  email?: string | null;
  avatarUrl: string;
  isGuest: boolean;
  token?: string;
}
