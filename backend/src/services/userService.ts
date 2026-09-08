import prisma from '../config/db';

export type UserSelfAction = 'SUSPEND' | 'DEACTIVATE' | 'DELETE';

export class UserSelfActionError extends Error {
  readonly statusCode = 400;

  constructor(_action: UserSelfAction) {
    super('You cannot suspend or delete your own account.');
    this.name = 'UserSelfActionError';
  }
}

export const assertUserSelfActionAllowed = (
  actingUserId: string | undefined,
  targetUserId: string,
  action: UserSelfAction
) => {
  if (actingUserId && actingUserId === targetUserId) {
    throw new UserSelfActionError(action);
  }
};

export const hardDeleteUserAccount = async (actingUserId: string | undefined, targetUserId: string) => {
  assertUserSelfActionAllowed(actingUserId, targetUserId, 'DELETE');

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: targetUserId } });
    if (!user) return null;

    const memberProfile = await tx.member.findUnique({
      where: { userId: targetUserId },
    });

    if (memberProfile) {
      await tx.member.delete({ where: { id: memberProfile.id } });
    }

    await tx.user.delete({ where: { id: targetUserId } });
    return user;
  });
};
