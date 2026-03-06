type User = {
    id: number;
    firstName: string;
    lastName: string;
}

class UserManager {
    private currentUser : User = {
        id: 1,
        firstName: 'Dawid',
        lastName: 'Chorąży'
    }

    getCurrentUser(){
        return this.currentUser;
    }
}

export default new UserManager();