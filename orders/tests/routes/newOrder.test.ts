import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/app';
import { Ticket } from '../../src/models/ticket';
import { Order, eOrderStatus } from '../../src/models/order';
import { natsWrapper } from '../../src/natsWrapper';

describe('Handles the creation of a new order', () => {
  it('returns an error if the ticket does not exists', async () => {
    const ticketId = mongoose.Types.ObjectId();
    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signup())
      .send({ ticketId })
      .expect(404);
  });

  it('returns an error if the ticket is already reserved', async () => {
    const ticket = await Ticket.build({ title: 'concert', price: 20 });
    await ticket.save();

    const order = Order.build({
      ticket,
      userId: 'adfasfsdffa',
      status: eOrderStatus.Created,
      expiresAt: new Date(),
    });

    await order.save();

    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signup())
      .send({ ticketId: ticket.id })
      .expect(400);
  });

  it('reserves a ticket', async () => {
    const ticket = await Ticket.build({ title: 'concert', price: 20 });
    await ticket.save();
    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signup())
      .send({ ticketId: ticket.id })
      .expect(201);
  });

  it('emits an order created event', async () => {
    const ticket = await Ticket.build({ title: 'concert', price: 20 });
    await ticket.save();
    await request(app)
      .post('/api/orders')
      .set('Cookie', global.signup())
      .send({ ticketId: ticket.id })
      .expect(201);

    expect(natsWrapper.client.publish).toHaveBeenCalled();
  });
});