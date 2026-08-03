import {
  employeeLogin,
  googleConfig,
  googleLogin,
  googleLoginPopup,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyToken,
  isAuthenticated,
} from './authService';
import * as userService from './userService';
import * as coordinatorService from './coordinatorService';
import * as eventService from './eventService';
import * as participantService from './participantService';
import * as emailService from './emailService';

async function login(email: string, password: string) {
  return employeeLogin(email, password);
}

async function employeeLoginFn(email: string, password: string) {
  return employeeLogin(email, password);
}

async function googleLoginFn(credential: string) {
  return googleLogin(credential);
}

const userApi = {
  list: (params?: { status?: string; search?: string; role?: string }) =>
    userService.listUsers(params),
  get: (id: string) => userService.getUser(id),
  create: (data: any) => userService.createUser(data),
  update: (id: string, data: any) => userService.updateUser(id, data),
  delete: (id: string) => userService.deleteUser(id),
  resetPassword: (id: string) => userService.resetUserPassword(id),
  unlock: (id: string) => userService.unlockUser(id),
};

const coordinatorApi = {
  list: (params?: { status?: string; search?: string }) =>
    coordinatorService.listCoordinators(params),
  get: (id: number) => coordinatorService.getCoordinator(id),
  create: (data: any) => coordinatorService.createCoordinator(data),
  update: (id: number, data: any) => coordinatorService.updateCoordinator(id, data),
  delete: (id: number) => coordinatorService.deleteCoordinator(id),
  assignEvents: (id: number, event_ids: Array<number | string>, method: 'POST' | 'PUT' = 'PUT') =>
    coordinatorService.assignEvents(id, event_ids, method),
  getAssignedEvents: (id: number) => coordinatorService.getAssignedEvents(id),
};

const eventApi = {
  list: (params?: { search?: string; status?: string }) => eventService.listEvents(params),
  get: (id: string | number) => eventService.getEvent(id),
  create: (data: any) => eventService.createEvent(data),
  update: (id: string | number, data: any) => eventService.updateEvent(id, data),
  delete: (id: string | number) => eventService.deleteEvent(id),
};

const participantApi = {
  me: () => participantService.me(),
  completeProfile: (data: any) => participantService.completeProfile(data),
  myEvents: () => participantService.myEvents(),
  registerEvent: (eventId: string | number, payment?: import('./participantService').RegisterPaymentInput) =>
    participantService.registerEvent(eventId, payment),
  registerEventBundle: (
    data: import('./participantService').RegisterEventBundleInput,
    payment: import('./participantService').RegisterPaymentInput
  ) => participantService.registerEventBundle(data, payment),
  register: (data: any) => participantService.register(data),
  list: (params?: { search?: string; status?: string }) => participantService.list(params),
  get: (id: string | number) => participantService.get(id),
  update: (id: string | number, data: any) => participantService.update(id, data),
  delete: (id: string | number) => participantService.remove(id),
};

const emailApi = {
  list: (params?: { search?: string; status?: string; type?: string; page?: number; limit?: number }) =>
    emailService.listEmails(params),
  get: (id: string) => emailService.getEmail(id),
  stats: () => emailService.emailStats(),
  types: () => emailService.emailTypes().then((types) => ({ types: types.map((t) => ({ type: t, label: t })) })),
  resend: (id: string) => emailService.resendEmail(id),
  test: (to: string, toName?: string) =>
    emailService.sendTestEmail(to).then((res) => ({ ...res, email: { recipient: to, recipient_name: toName || to }, smtp_configured: false })),
};

export const api = {
  login,
  employeeLogin: employeeLoginFn,
  googleConfig: async () => googleConfig(),
  googleLogin: googleLoginFn,
  googleLoginPopup,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyToken,
  isAuthenticated,
  user: userApi,
  coordinator: coordinatorApi,
  event: eventApi,
  email: emailApi,
  participant: participantApi,
};
