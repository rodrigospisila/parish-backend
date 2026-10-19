import { ValidationPipe } from '@nestjs/common';
import { CreateLeadDto } from './create-lead.dto';
import { TrackEventsDto } from '../../product-events/dto/track-events.dto';
import { CreateAnnouncementDto } from '../../announcements/dto/announcement.dto';

// Mesmas opções do pipe global (main.ts)
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const validate = (metatype: any, value: unknown) => pipe.transform(value, { type: 'body', metatype });

describe('DTOs públicos do C4 (validação estrita)', () => {
  it('lead: consentimento obrigatório, honeypot aceito como campo, extras recusados', async () => {
    await expect(validate(CreateLeadDto, { name: 'Ana', email: 'ana@x.com', consent: true, website: '' })).resolves.toBeDefined();
    await expect(validate(CreateLeadDto, { name: 'Ana', email: 'ana@x.com' })).rejects.toBeDefined();
    await expect(validate(CreateLeadDto, { name: 'Ana', email: 'ana@x.com', consent: false })).rejects.toBeDefined();
    await expect(validate(CreateLeadDto, { name: 'Ana', email: 'nao-e-email', consent: true })).rejects.toBeDefined();
    await expect(validate(CreateLeadDto, { name: 'Ana', email: 'ana@x.com', consent: true, status: 'WON' })).rejects.toBeDefined();
    await expect(validate(CreateLeadDto, { name: 'Ana', phone: '42 9999', state: 'Paraná', consent: true })).rejects.toBeDefined();
  });

  it('eventos: no máximo 50, plataforma web|app, sem campos extras', async () => {
    const ev = { name: 'app_open', platform: 'app', appVersion: '1.2.3' };
    await expect(validate(TrackEventsDto, { events: [ev] })).resolves.toBeDefined();
    await expect(validate(TrackEventsDto, { events: Array(51).fill(ev) })).rejects.toBeDefined();
    await expect(validate(TrackEventsDto, { events: [{ ...ev, platform: 'desktop' }] })).rejects.toBeDefined();
    await expect(validate(TrackEventsDto, { events: [{ ...ev, userId: 'u1' }] })).rejects.toBeDefined();
    await expect(validate(TrackEventsDto, { events: [{ ...ev, role: 'SYSTEM_ADMIN' }] })).rejects.toBeDefined();
  });

  it('aviso: tipo e público em lista fechada; endsAt aceita null', async () => {
    await expect(validate(CreateAnnouncementDto, { title: 'Novidade', body: 'x', kind: 'NEWS', audience: 'ALL', endsAt: null })).resolves.toBeDefined();
    await expect(validate(CreateAnnouncementDto, { title: 'Novidade', body: 'x', audience: 'FAITHFUL' })).rejects.toBeDefined();
    await expect(validate(CreateAnnouncementDto, { title: 'Novidade', body: 'x', startsAt: 'amanhã' })).rejects.toBeDefined();
  });
});
