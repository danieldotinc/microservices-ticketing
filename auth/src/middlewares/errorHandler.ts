import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../errors/customError';
import { logger } from '../startup/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof CustomError) {
    for (let error of err.serializeErrors()) {
      logger.error('errorHandler ==> CustomError thrown: ' + error.message);
    }
    return res.status(err.statusCode).send({ errors: err.serializeErrors() });
  }

  logger.error('errorHandler ==> Unknown error thrown: ' + err.message);
  res.status(400).send({
    errors: [{ message: 'Something went wrong' }],
  });
};
