// 前端认证模块
const Auth = {
  TOKEN_KEY: 'fizz_token',
  USER_KEY: 'fizz_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.USER_KEY));
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  isPremium() {
    const user = this.getUser();
    return user?.is_premium || false;
  },

  save(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  authHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  async register(email, nickname, password) {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nickname, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    this.save(data.token, data.user);
    return data.user;
  },

  async login(email, password) {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    this.save(data.token, data.user);
    return data.user;
  },

  async checkSession() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        this.logout();
        return null;
      }
      const data = await res.json();
      localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch {
      return null;
    }
  },

  async saveToMailbox(type, content, metadata) {
    if (!this.isLoggedIn()) return;
    try {
      await fetch('/api/mailbox/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders(),
        },
        body: JSON.stringify({ type, content, metadata }),
      });
    } catch {
      // 静默失败
    }
  },

  async getMailbox() {
    const res = await fetch('/api/mailbox', {
      headers: this.authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.letters;
  },

  async deleteFromMailbox(id) {
    const res = await fetch('/api/mailbox/' + id, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || '删除失败');
    }
  },

  async redeem(code) {
    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(),
      },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await this.checkSession();
    return data.message;
  },
};
