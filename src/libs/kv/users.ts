import type { PersonalInfo } from '../../types';

interface KVOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function handleKVError(error: unknown, message: string): KVOperationResult<never> {
  console.error(message, error);
  return {
    success: false,
    error: error instanceof Error ? error.message : message,
  };
}

export async function saveUser(personalInfo: PersonalInfo, env: Cloudflare.Env): Promise<KVOperationResult<void>> {
  try {
    console.log('Saving user data to KV', personalInfo);
    await env.users.put(
      personalInfo.email,
      JSON.stringify(personalInfo),
    );

    console.log('User data saved to KV', personalInfo);
    
    return { success: true };
  } catch (error) {
    return handleKVError(error, 'Failed to save user data');
  }
}

export async function getUser(email: string, env: Cloudflare.Env): Promise<KVOperationResult<PersonalInfo>> {
  try {
    const userData = await env.users.get(email);
    
    if (!userData) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      data: JSON.parse(userData) as PersonalInfo,
    };
  } catch (error) {
    return handleKVError(error, 'Failed to retrieve user data');
  }
}

export async function deleteUser(email: string, env: Cloudflare.Env): Promise<KVOperationResult<void>> {
  try {
    await env.users.delete(email);
    return { success: true };
  } catch (error) {
    return handleKVError(error, 'Failed to delete user data');
  }
}

export async function listUsers(env: Cloudflare.Env): Promise<KVOperationResult<PersonalInfo[]>> {
  try {
    const list = await env.users.list();
    const users = await Promise.all(
      list.keys.map(async (key) => {
        const userData = await env.users.get(key.name);
        return userData ? JSON.parse(userData) as PersonalInfo : null;
      })
    );

    return {
      success: true,
      data: users.filter((user): user is PersonalInfo => user !== null),
    };
  } catch (error) {
    return handleKVError(error, 'Failed to list users');
  }
} 