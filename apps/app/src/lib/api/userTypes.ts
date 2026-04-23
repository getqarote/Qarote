export interface RabbitMQUser {
  name: string;
  tags?: string[];
  password_hash?: string; // Only for existence check
  limits?: {
    max_connections?: number;
    max_channels?: number;
  };
  accessibleVhosts?: string[];
}

interface RabbitMQUserPermission {
  user: string;
  vhost: string;
  configure: string;
  write: string;
  read: string;
}

type _CreateUserRequest = {
  username: string;
  password?: string;
  tags?: string;
};

type _UpdateUserRequest = {
  password?: string;
  tags?: string;
  removePassword?: boolean;
};

type _SetUserPermissionRequest = {
  vhost: string;
  configure: string;
  write: string;
  read: string;
};

type _UserDetailsResponse = {
  user: RabbitMQUser;
  permissions: RabbitMQUserPermission[];
};
