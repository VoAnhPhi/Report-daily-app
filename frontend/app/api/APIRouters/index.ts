import { auth } from './auth.router';
import { admin, user } from './user.router';
import { news } from './news.router';
import { kiotviet } from './kiotviet.router';
import { address } from './address.router';
import { identity } from './identity.router';
import { public_ecommerce } from './public-e-commerce.router';
import { gamification } from './gamification.router';
import { recognizedUsers } from './recognized-users.router';
import { business_teams } from './business-teams.router';
import { business_forms } from './business-forms.router';
import { halfWallet } from './half-wallet.router';
import { tasks, taskGroups } from './tasks.router';
import {
  dailyReports,
  dailyReportScopes,
  dailyReportTemplates,
  dailyReportHelpRequests,
} from './daily-reports.router';
import { trainingVideos } from './training-videos.router';
import { babysitter } from './babysitter.router';
import { wallet } from './wallet.router';
import { birthdays } from './birthdays.router';
import { nhanVienNhan } from './nhan-vien-nhan.router';

export const APIRouters = {
  auth,
  user,
  news,
  admin,
  kiotviet,
  address,
  identity,
  public_ecommerce,
  gamification,
  recognizedUsers,
  business_teams,
  business_forms,
  halfWallet,
  tasks,
  taskGroups,
  dailyReports,
  dailyReportScopes,
  dailyReportTemplates,
  dailyReportHelpRequests,
  trainingVideos,
  babysitter,
  wallet,
  birthdays,
  nhanVienNhan,
};
