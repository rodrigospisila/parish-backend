import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, Request, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CatechesisService } from './catechesis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('catechesis')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatechesisController {
  constructor(private readonly service: CatechesisService) {}

  // Etapas (catálogo por paróquia)
  @Post('stages')
  @Roles(UserRole.PARISH_ADMIN)
  createStage(
    @Body() dto: { name: string; description?: string; ordering?: number; sacramentType?: any; parishId?: string; color?: string },
    @Request() req: any,
  ) {
    return this.service.createStage(dto, req.user);
  }

  @Get('stages')
  listStages(@Request() req: any) {
    return this.service.listStages(req.user);
  }

  // Editar etapa: estrutura é PARISH_ADMIN+ (service valida); a COR pode ser
  // ajustada pela coordenação da própria paróquia (pastoral/comunidade)
  @Patch('stages/:id')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  updateStage(
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string | null; ordering?: number; sacramentType?: any; color?: string | null },
    @Request() req: any,
  ) {
    return this.service.updateStage(id, dto, req.user);
  }

  // App do catequista: minhas turmas (guard operacional fica no service)
  @Get('my-classes')
  myClasses(@Request() req: any) {
    return this.service.getMyClasses(req.user);
  }

  // App da família: matrículas próprias e dos dependentes
  @Get('my-family')
  myFamily(@Request() req: any) {
    return this.service.getMyFamilyCatechesis(req.user);
  }

  // Inscrição online: turmas abertas + inscrever (self-service da família)
  @Get('open-classes')
  openClasses(@Request() req: any, @Query('communityId') communityId?: string) {
    return this.service.listOpenClasses(req.user, communityId);
  }

  @Post('apply')
  apply(
    @Body()
    dto: {
      classId: string;
      forMemberId?: string;
      newChild?: { fullName: string; birthDate?: string };
      consentGiven: boolean;
    },
    @Request() req: any,
  ) {
    return this.service.apply(dto, req.user);
  }

  // Aprovação da inscrição (catequista da turma ou coordenação — service valida)
  @Patch('enrollments/:id/approve')
  approve(@Param('id') id: string, @Request() req: any) {
    return this.service.approveEnrollment(id, req.user);
  }

  @Patch('enrollments/:id/reject')
  reject(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: any) {
    return this.service.rejectEnrollment(id, body?.reason, req.user);
  }

  // Papelada (PDF): certificado, lote, lista da turma e declaração.
  // Guard no service: equipe da turma OU a própria família (individuais).
  @Get('enrollments/:id/certificate.pdf')
  async certificate(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.generateCertificate(id, req.user);
    this.sendPdf(res, buffer, 'certificado-catequese.pdf');
  }

  @Get('classes/:id/certificates.pdf')
  async classCertificates(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.generateClassCertificates(id, req.user);
    this.sendPdf(res, buffer, 'certificados-turma.pdf');
  }

  @Get('classes/:id/roster.pdf')
  async roster(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.generateClassRoster(id, req.user);
    this.sendPdf(res, buffer, 'lista-turma.pdf');
  }

  @Get('enrollments/:id/declaration.pdf')
  async declaration(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.generateEnrollmentDeclaration(id, req.user);
    this.sendPdf(res, buffer, 'declaracao-matricula.pdf');
  }

  // Corrigir/excluir encontro (equipe da turma — service valida)
  @Patch('sessions/:id')
  updateSession(
    @Param('id') id: string,
    @Body() dto: { date?: string; topic?: string },
    @Request() req: any,
  ) {
    return this.service.updateSession(id, dto, req.user);
  }

  @Delete('sessions/:id')
  deleteSession(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteSession(id, req.user);
  }

  // Aviso direcionado a UMA família (equipe da turma — service valida)
  @Post('enrollments/:id/notify')
  notifyFamily(@Param('id') id: string, @Body() body: { message: string }, @Request() req: any) {
    return this.service.notifyEnrollmentFamily(id, body?.message, req.user);
  }

  // Agenda do ano em lote (equipe da turma — service valida)
  @Post('classes/:id/generate-sessions')
  generateSessions(@Param('id') id: string, @Body() body: { dates: string[] }, @Request() req: any) {
    return this.service.generateSessions(id, body, req.user);
  }

  private sendPdf(res: Response, buffer: Buffer, filename: string) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  // Documentos da matrícula: família envia, equipe confere (service valida)
  @Post('enrollments/:id/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  submitDocument(
    @Param('id') id: string,
    @Body() body: { kind: string },
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.service.submitDocument(id, body, file, req.user);
  }

  @Get('enrollments/:id/documents')
  listDocuments(@Param('id') id: string, @Request() req: any) {
    return this.service.listDocuments(id, req.user);
  }

  // Declaração SEM arquivo: "não tem" ou batismo de outra denominação —
  // família ou equipe (service valida contra os requisitos da turma)
  @Post('enrollments/:id/documents/declaration')
  submitDeclaration(
    @Param('id') id: string,
    @Body() dto: { kind: string; declaration: string; denomination?: string },
    @Request() req: any,
  ) {
    return this.service.submitDeclaration(id, dto, req.user);
  }

  // Requisitos de documentos da inscrição: leitura para qualquer autenticado
  // (a família precisa ver o que a turma pede); edição pela coordenação
  @Get('classes/:id/doc-requirements')
  classDocRequirements(@Param('id') id: string, @Request() req: any) {
    return this.service.getClassDocRequirements(id, req.user);
  }

  @Put('classes/:id/doc-requirements')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  setClassDocRequirements(
    @Param('id') id: string,
    @Body() dto: { items: Array<{ kind: string; required?: boolean; allowNotHave?: boolean; allowOtherDenomination?: boolean }> },
    @Request() req: any,
  ) {
    return this.service.setClassDocRequirements(id, dto, req.user);
  }

  // Frequência detalhada por encontro (família ou equipe — service valida)
  @Get('enrollments/:id/attendance')
  enrollmentAttendance(@Param('id') id: string, @Request() req: any) {
    return this.service.getEnrollmentAttendance(id, req.user);
  }

  @Get('documents/:id/file')
  async documentFile(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const file = await this.service.getDocumentFile(id, req.user);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${file.fileName.replace(/[^\w.\-]/g, '_')}"`,
      'Content-Length': String(file.buffer.length),
    });
    res.end(file.buffer);
  }

  // Corrigir o cadastro do catequizando conforme o LIDO do documento —
  // família da matrícula ou equipe (service valida; auditado; reconfere)
  @Post('documents/:id/apply-correction')
  applyDocumentCorrection(@Param('id') id: string, @Request() req: any) {
    return this.service.applyDocumentCorrection(id, req.user);
  }

  @Patch('documents/:id/review')
  reviewDocument(
    @Param('id') id: string,
    @Body() body: { approve: boolean; notes?: string },
    @Request() req: any,
  ) {
    return this.service.reviewDocument(id, body, req.user);
  }

  // Pareceres por período (equipe escreve; equipe e família leem — service valida)
  @Post('enrollments/:id/assessments')
  upsertAssessment(
    @Param('id') id: string,
    @Body() dto: { period: string; rating?: string; notes: string },
    @Request() req: any,
  ) {
    return this.service.upsertAssessment(id, dto, req.user);
  }

  @Get('enrollments/:id/assessments')
  listAssessments(@Param('id') id: string, @Request() req: any) {
    return this.service.listAssessments(id, req.user);
  }

  // Parecer em lote para a turma (equipe — service valida)
  @Post('classes/:id/assessments')
  upsertAssessmentsBatch(
    @Param('id') id: string,
    @Body() dto: { period: string; rating?: string; notes: string; enrollmentIds: string[] },
    @Request() req: any,
  ) {
    return this.service.upsertAssessmentsBatch(id, dto, req.user);
  }

  // Taxa de material (coordenação registra; equipe consulta)
  @Post('classes/:id/fees')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  createFee(
    @Param('id') id: string,
    @Body() dto: { description: string; amount: number; dueDate?: string },
    @Request() req: any,
  ) {
    return this.service.createFee(id, dto, req.user);
  }

  @Get('classes/:id/fees')
  classFees(@Param('id') id: string, @Request() req: any) {
    return this.service.getClassFees(id, req.user);
  }

  @Post('fees/:id/payments')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  recordFeePayment(
    @Param('id') id: string,
    @Body() dto: { enrollmentId: string; method?: string; waived?: boolean },
    @Request() req: any,
  ) {
    return this.service.recordFeePayment(id, dto, req.user);
  }

  // Conversa família ↔ equipe por matrícula (Onda 4) — service decide o lado
  @Get('enrollments/:id/messages')
  listMessages(@Param('id') id: string, @Request() req: any) {
    return this.service.listMessages(id, req.user);
  }

  @Post('enrollments/:id/messages')
  sendMessage(@Param('id') id: string, @Body() body: { body: string }, @Request() req: any) {
    return this.service.sendMessage(id, body?.body, req.user);
  }

  @Get('classes/:id/conversations')
  classConversations(@Param('id') id: string, @Request() req: any) {
    return this.service.listClassConversations(id, req.user);
  }

  // Recibo do pagamento da taxa (família ou equipe — service valida)
  @Get('fees/payments/:id/receipt.pdf')
  async feeReceipt(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.generateFeeReceipt(id, req.user);
    this.sendPdf(res, buffer, 'recibo-taxa.pdf');
  }

  // Exportação financeira das taxas da turma (CSV)
  @Get('classes/:id/fees/export.csv')
  async feesCsv(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const csv = await this.service.exportClassFeesCsv(id, req.user);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="taxas-turma.csv"',
    });
    res.end(csv);
  }

  // Planejamento de temas em lote (equipe — service valida)
  @Post('classes/:id/sessions/topics')
  updateTopics(
    @Param('id') id: string,
    @Body() body: { items: Array<{ sessionId: string; topic: string }> },
    @Request() req: any,
  ) {
    return this.service.updateSessionTopics(id, body?.items, req.user);
  }

  // Histórico de avisos enviados às famílias (equipe — service valida)
  @Get('classes/:id/sent-notices')
  sentNotices(@Param('id') id: string, @Request() req: any) {
    return this.service.listSentNotices(id, req.user);
  }

  // Panorama da comunidade: pendências consolidadas entre turmas (coordenação)
  @Get('community-overview')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  communityOverview(@Request() req: any, @Query('communityId') communityId?: string) {
    return this.service.getCommunityOverview(req.user, communityId);
  }

  // Visão diocesana: catequizandos por paróquia/etapa
  @Get('diocese-overview')
  @Roles(UserRole.DIOCESAN_ADMIN)
  dioceseOverview(@Request() req: any, @Query('dioceseId') dioceseId?: string) {
    return this.service.getDioceseOverview(req.user, dioceseId);
  }

  // Renovação em lote (coordenação)
  @Get('classes/:id/renewal-preview')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  renewalPreview(@Param('id') id: string, @Request() req: any) {
    return this.service.renewalPreview(id, req.user);
  }

  @Post('classes/:id/renew')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  renew(
    @Param('id') id: string,
    @Body() body: { targetClassId: string; enrollmentIds: string[]; overrideCapacity?: boolean },
    @Request() req: any,
  ) {
    return this.service.renewClass(id, body, req.user);
  }

  // Conclusão em lote da turma: uma data/ministro, resultado parcial por matrícula
  @Post('classes/:id/complete-batch')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  completeBatch(
    @Param('id') id: string,
    @Body() dto: { enrollmentIds: string[]; date?: string; minister?: string },
    @Request() req: any,
  ) {
    return this.service.completeClassBatch(id, dto, req.user);
  }

  // Painel "Encerramento do ano" da comunidade (coordenação)
  @Get('year-end-overview')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  yearEndOverview(@Request() req: any, @Query('communityId') communityId?: string) {
    return this.service.getYearEndOverview(req.user, communityId);
  }

  // Turmas
  @Post('classes')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  createClass(
    @Body() dto: { name: string; year: number; stageId: string; communityId: string; weekday?: number; time?: string; room?: string; capacity?: number },
    @Request() req: any,
  ) {
    return this.service.createClass(dto, req.user);
  }

  @Get('classes')
  listClasses(@Request() req: any, @Query('communityId') communityId?: string) {
    return this.service.listClasses(req.user, communityId);
  }

  // Virada de ano: cria a turma sucessora (mesma etapa, ano seguinte),
  // herdando dados e catequistas — mantidos ou ajustados. Piso PASTORAL:
  // é quem opera o encerramento (painel/concluir/distribuir são dela), e o
  // rollover só CLONA uma turma existente da própria comunidade — turma nova
  // "do zero" continua exigindo coordenação de comunidade (POST /classes)
  @Post('classes/:id/rollover')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  rolloverClass(
    @Param('id') id: string,
    @Body() dto: { year?: number; name?: string; weekday?: number | null; time?: string | null; room?: string | null; capacity?: number | null; catechistMemberIds?: string[] },
    @Request() req: any,
  ) {
    return this.service.rolloverClass(id, dto, req.user);
  }

  // Editar a turma (inclui o limite de vagas)
  @Patch('classes/:id')
  @Roles(UserRole.COMMUNITY_COORDINATOR)
  updateClass(
    @Param('id') id: string,
    @Body() dto: {
      name?: string;
      year?: number;
      weekday?: number | null;
      time?: string | null;
      room?: string | null;
      capacity?: number | null;
      enrollmentOpen?: boolean;
      enrollmentOpensAt?: string | null;
      enrollmentClosesAt?: string | null;
      fullBehavior?: string;
    },
    @Request() req: any,
  ) {
    return this.service.updateClass(id, dto, req.user);
  }

  // Painel da turma: catequista vinculado OU escopo de gestão (service valida)
  @Get('classes/:id/report')
  classReport(@Param('id') id: string, @Request() req: any) {
    return this.service.getClassReport(id, req.user);
  }

  @Get('classes/:id/sessions')
  listSessions(@Param('id') id: string, @Request() req: any) {
    return this.service.listSessions(id, req.user);
  }

  @Get('sessions/:id/attendance')
  sessionAttendance(@Param('id') id: string, @Request() req: any) {
    return this.service.getSessionAttendance(id, req.user);
  }

  @Get('classes/:id/eligible-catechists')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  eligibleCatechists(@Param('id') id: string, @Request() req: any) {
    return this.service.listEligibleCatechists(id, req.user);
  }

  @Post('classes/:id/catechists')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  addCatechist(@Param('id') id: string, @Body() body: { memberId: string; role?: string }, @Request() req: any) {
    return this.service.addCatechist(id, body.memberId, body.role, req.user);
  }

  @Delete('classes/:id/catechists/:memberId')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  removeCatechist(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req: any) {
    return this.service.removeCatechist(id, memberId, req.user);
  }

  // Matrícula
  @Post('enrollments')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  enroll(
    @Body() dto: { classId: string; memberId: string; pendingDocuments?: string; requireBaptism?: boolean; overrideCapacity?: boolean; unbaptized?: boolean },
    @Request() req: any,
  ) {
    return this.service.enroll(dto, req.user);
  }

  @Patch('enrollments/:id/transfer')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  transfer(@Param('id') id: string, @Body() body: { targetClassId: string }, @Request() req: any) {
    return this.service.transferEnrollment(id, body.targetClassId, req.user);
  }

  @Patch('enrollments/:id/documents')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  updateDocuments(
    @Param('id') id: string,
    @Body() body: { pendingDocuments?: string | null },
    @Request() req: any,
  ) {
    return this.service.updateEnrollmentDocuments(id, body.pendingDocuments ?? null, req.user);
  }

  @Patch('enrollments/:id/complete')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  complete(@Param('id') id: string, @Body() dto: { date?: string; minister?: string }, @Request() req: any) {
    return this.service.completeEnrollment(id, dto, req.user);
  }

  // Encontros e chamada — catequista da turma OU escopo de gestão (service valida)
  @Post('classes/:id/sessions')
  createSession(@Param('id') id: string, @Body() dto: { date: string; topic?: string }, @Request() req: any) {
    return this.service.createSession(id, dto, req.user);
  }

  // Mensagem do catequista/coordenação para as famílias da turma
  @Post('classes/:id/notify')
  notifyFamilies(@Param('id') id: string, @Body() body: { message: string }, @Request() req: any) {
    return this.service.notifyClassFamilies(id, body?.message ?? '', req.user);
  }

  @Post('sessions/:id/attendance')
  markAttendance(
    @Param('id') id: string,
    @Body() body: { entries: Array<{ enrollmentId: string; present: boolean; late?: boolean; justified?: boolean; clear?: boolean }> },
    @Request() req: any,
  ) {
    return this.service.markAttendance(id, body.entries, req.user);
  }

  // Folha de presença (alunos × encontros) — equipe da turma (service valida)
  @Get('classes/:id/attendance-grid')
  attendanceGrid(@Param('id') id: string, @Request() req: any) {
    return this.service.getAttendanceGrid(id, req.user);
  }

  // Atestado da falta justificada
  @Post('sessions/:sessionId/attendance/:enrollmentId/certificate')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  attachAbsenceCertificate(
    @Param('sessionId') sessionId: string,
    @Param('enrollmentId') enrollmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.service.attachAbsenceCertificate(sessionId, enrollmentId, file, req.user);
  }

  @Get('sessions/:sessionId/attendance/:enrollmentId/certificate')
  async absenceCertificate(
    @Param('sessionId') sessionId: string,
    @Param('enrollmentId') enrollmentId: string,
    @Res() res: Response,
    @Request() req: any,
  ) {
    const file = await this.service.getAbsenceCertificate(sessionId, enrollmentId, req.user);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${file.fileName.replace(/[^\w.\-]/g, '_')}"`,
      'Content-Length': String(file.buffer.length),
    });
    res.end(file.buffer);
  }

  @Delete('sessions/:sessionId/attendance/:enrollmentId/certificate')
  removeAbsenceCertificate(
    @Param('sessionId') sessionId: string,
    @Param('enrollmentId') enrollmentId: string,
    @Request() req: any,
  ) {
    return this.service.removeAbsenceCertificate(sessionId, enrollmentId, req.user);
  }
}
