import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Task {
    id: bigint;
    status: string;
    completedAt: string;
    title: string;
    assignedTo: string;
    createdAt: string;
    dueDate: string;
    description: string;
    priority: string;
}
export interface UserProfile {
    name: string;
    role: string;
}
export interface ChecklistItem {
    id: bigint;
    title: string;
    date: string;
    completed: boolean;
    category: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    /**
     * / ***************
     * /    * Checklist     *
     * /    ****************
     */
    addChecklistItem(title: string, date: string, category: string): Promise<bigint>;
    /**
     * / ****************************
     * /    * Task Management           *
     * /    *****************************
     */
    addTask(title: string, description: string, priority: string, dueDate: string, assignedTo: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    completeTask(id: bigint): Promise<void>;
    deleteChecklistItem(id: bigint): Promise<void>;
    deleteTask(id: bigint): Promise<void>;
    /**
     * / **********
     * /    * Profiles *
     * /    ***********
     */
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChecklistItemsByDate(date: string): Promise<Array<ChecklistItem>>;
    getCurrentInvoiceCounter(): Promise<bigint>;
    getLowStockThreshold(): Promise<bigint>;
    /**
     * / *************************
     * /    * Invoice Counter        *
     * /    **************************
     */
    getNextInvoiceNumber(): Promise<bigint>;
    getTasks(): Promise<Array<Task>>;
    getTasksByAssignee(assignedTo: string): Promise<Array<Task>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    resetChecklistForNewDay(date: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    /**
     * / ******************
     * /    * Low Stock        *
     * /    *******************
     */
    saveLowStockThreshold(value: bigint): Promise<void>;
    toggleChecklistItem(id: bigint): Promise<void>;
    updateTask(id: bigint, title: string, description: string, priority: string, dueDate: string, assignedTo: string, status: string): Promise<void>;
}
