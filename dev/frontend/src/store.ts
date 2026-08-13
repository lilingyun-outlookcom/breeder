import { reactive } from 'vue';
import { setToken as saveToken, clearToken as dropToken, readScoped, USER_KEY } from './api';

interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'vet' | 'keeper';
  phone?: string;
}

function loadUser(): User | null {
  try {
    return JSON.parse(readScoped('user') || 'null');
  } catch {
    return null;
  }
}

export const auth = reactive({
  token: readScoped('token') || '',
  user: loadUser() as User | null,
  get isLogin() {
    return !!this.token;
  },
  get isAdmin() {
    return this.user?.role === 'admin' || this.user?.role === 'vet';
  },
  login(token: string, user: User) {
    this.token = token;
    this.user = user;
    saveToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  setUser(user: User) {
    this.user = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  logout() {
    this.token = '';
    this.user = null;
    dropToken();
  },
});

export const roleName = (r?: string) =>
  r === 'admin' ? '管理员' : r === 'vet' ? '兽医' : r === 'keeper' ? '饲养员' : '-';
