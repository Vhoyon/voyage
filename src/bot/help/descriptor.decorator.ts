import { SetMetadata } from '@nestjs/common';

export const Descriptor = (...args: string[]) => SetMetadata('descriptor', args);
