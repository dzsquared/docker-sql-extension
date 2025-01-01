import { ServiceError } from '@docker/extension-api-client-types/dist/v1';

export class RequestError implements ServiceError {
    name: string;
    message: string;
    statusCode: number;

    // constructor(name, message, statusCode) {
    //     super(name, message, statusCode);
    // }
}