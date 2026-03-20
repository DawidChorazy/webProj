export interface User {
  id: number;
  firstName: string;
  lastName: string;
}

class UserManager {
  private currentUser: User = {
    id: 1,
    firstName: "Jan",
    lastName: "Kowalski",
  };

  getCurrentUser(): User {
    return this.currentUser;
  }
}

export default new UserManager();