window.Auth = {
  async loginWithPassword(email, password) {
    await API.api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  async logout() {
    await API.api("/auth/logout", { method: "POST" });
    location.href = "/index.html";
  },
  async me() {
    try {
      return await API.api("/auth/me");
    } catch {
      return null;
    }
  },
  async guard({ roles } = {}) {
    const me = await this.me();
    if (!me) return (location.href = "/index.html");
    if (roles && !roles.includes(me.role))
      return (location.href = "/dashboard.html");
    return me;
  },
};
