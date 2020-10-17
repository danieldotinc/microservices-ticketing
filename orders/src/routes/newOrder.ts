import {
  BadRequestError,
  eOrderStatus,
  NotFoundError,
  requireAuth,
  validateRequest,
} from '@fullstackeng/common';
import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import { OrderCreatedPublisher } from '../events/publishers/orderCreatedPublisher';
import { OrderEntity } from '../models/entities/orderEntity';
import { Order } from '../models/order';
import { Ticket } from '../models/ticket';
import { natsWrapper } from '../natsWrapper';

const router = express.Router();
const EXPIRATION_WINDOW_SECONDS = 15 * 60;

router.post(
  '/',
  requireAuth,
  [
    body('ticketId')
      .not()
      .isEmpty()
      .custom(input => mongoose.Types.ObjectId.isValid(input))
      .withMessage('TicketId must be provided'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { ticketId } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw new NotFoundError('Ticket not found.');

    const isReserved = await ticket.isReserved();
    if (isReserved) throw new BadRequestError('Ticket is already reserved');

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + EXPIRATION_WINDOW_SECONDS);

    const orderEntity = new OrderEntity({
      userId: req.currentUser!.id,
      status: eOrderStatus.Created,
      expiresAt,
      ticket,
    });
    const order = Order.build(orderEntity.getOrderInfo());
    await order.save();

    const { id, status, userId } = order;
    const ticketInfo = { id: ticket.id, price: ticket.price };
    new OrderCreatedPublisher(natsWrapper.client).publish({
      id,
      status,
      userId,
      expiresAt: expiresAt.toISOString(),
      ticket: ticketInfo,
    });

    res.status(201).send(order);
  }
);

export { router as newOrder };