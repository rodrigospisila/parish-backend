import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, Request, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CatechesisService } from './catechesis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanFeatureGuard } from '../plans/plan-feature.guard';
import { PlanResource, RequiresFeature } from '../plans/plan.decorators';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// Recurso pago da comunidade (planos): o fiel/família não paga — vale o plano
// da comunidade da turma
@Controller('catechesis')
@UseGuards(JwtAuthGuard, RolesGuard, PlanFeatureGuard)
@RequiresFeature('catechesis')
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
  @PlanResource('catechesisStage')
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
  @PlanResource('catechesisClass:body.classId')
  apply(
    @Body()
    dto: {
      classId: string;
      forMemberId?: string;
      newChild?: { fullName: string; birthDate?: string };
      consentGiven: boolean;
      /** Uso de imagem: true autoriza, false nega (resposta explícita do responsável) */
      imageConsent?: boolean;
    },
    @Request() req: any,
  ) {
    return this.service.apply(dto, req.user);
  }

  // Aprovação da inscrição (catequista da turma ou coordenação — service valida)
  @Patch('enrollments/:id/approve')
  @PlanResource('catechesisEnrollment')
  approve(@Param('id') id: string, @Request() req: any) {
    return this.service.approveEnrollment(id, req.user);
  }

  @Patch('enrollments/:id/reject')
  @PlanResource('catechesisEnrollment')
  reject(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: any) {
    return this.service.rejectEnrollment(id, body?.reason, req.user);
  }

  // Papelada (PDF): certificado, lote, lista da turma e declaração.
  // Guard no service: equipe da turma OU a própria família (individuais).
  @Get('enrollments/:id/certificate.pdf')
  @PlanResource('catechesisEnrollment')
  async certificate(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.generateCertificate(id, req.user);
    this.sendPdf(res, buffer, 'certificado-catequese.pdf');
  }

  @Get('classes/:id/certificates.pdf')
  @PlanResource('catechesisClass')
  async classCertificates(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.generateClassCertificates(id, req.user);
    this.sendPdf(res, buffer, 'certificados-turma.pdf');
  }

  @Get('classes/:id/roster.pdf')
  @PlanResource('catechesisClass')
  async roster(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.generateClassRoster(id, req.user);
    this.sendPdf(res, buffer, 'lista-turma.pdf');
  }

  @Get('enrollments/:id/declaration.pdf')
  @PlanResource('catechesisEnrollment')
  async declaration(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.generateEnrollmentDeclaration(id, req.user);
    this.sendPdf(res, buffer, 'declaracao-matricula.pdf');
  }

  // Corrigir/excluir encontro (equipe da turma — service valida)
  @Patch('sessions/:id')
  @PlanResource('catechesisSession')
  updateSession(
    @Param('id') id: string,
    @Body() dto: { date?: string; topic?: string },
    @Request() req: any,
  ) {
    return this.service.updateSession(id, dto, req.user);
  }

  @Delete('sessions/:id')
  @PlanResource('catechesisSession')
  deleteSession(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteSession(id, req.user);
  }

  // Aviso direcionado a UMA família (equipe da turma — service valida)
  @Post('enrollments/:id/notify')
  @PlanResource('catechesisEnrollment')
  notifyFamily(@Param('id') id: string, @Body() body: { message: string }, @Request() req: any) {
    return this.service.notifyEnrollmentFamily(id, body?.message, req.user);
  }

  // Agenda do ano em lote (equipe da turma — service valida)
  @Post('classes/:id/generate-sessions')
  @PlanResource('catechesisClass')
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
  @PlanResource('catechesisEnrollment')
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
  @PlanResource('catechesisEnrollment')
  listDocuments(@Param('id') id: string, @Request() req: any) {
    return this.service.listDocuments(id, req.user);
  }

  // Declaração SEM arquivo: "não tem" ou batismo de outra denominação —
  // família ou equipe (service valida contra os requisitos da turma)
  @Post('enrollments/:id/documents/declaration')
  @PlanResource('catechesisEnrollment')
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
  @PlanResource('catechesisClass')
  classDocRequirements(@Param('id') id: string, @Request() req: any) {
    return this.service.getClassDocRequirements(id, req.user);
  }

  @Put('classes/:id/doc-requirements')
  @PlanResource('catechesisClass')
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
  @PlanResource('catechesisEnrollment')
  enrollmentAttendance(@Param('id') id: string, @Request() req: any) {
    return this.service.getEnrollmentAttendance(id, req.user);
  }

  @Get('documents/:id/file')
  @PlanResource('catechesisDocument')
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
  @PlanResource('catechesisDocument')
  applyDocumentCorrection(@Param('id') id: string, @Request() req: any) {
    return this.service.applyDocumentCorrection(id, req.user);
  }

  @Patch('documents/:id/review')
  @PlanResource('catechesisDocument')
  reviewDocument(
    @Param('id') id: string,
    @Body() body: { approve: boolean; notes?: string },
    @Request() req: any,
  ) {
    return this.service.reviewDocument(id, body, req.user);
  }

  // Pareceres por período (equipe escreve; equipe e família leem — service valida)
  @Post('enrollments/:id/assessments')
  @PlanResource('catechesisEnrollment')
  upsertAssessment(
    @Param('id') id: string,
    @Body() dto: { period: string; rating?: string; notes: string },
    @Request() req: any,
  ) {
    return this.service.upsertAssessment(id, dto, req.user);
  }

  @Get('enrollments/:id/assessments')
  @PlanResource('catechesisEnrollment')
  listAssessments(@Param('id') id: string, @Request() req: any) {
    return this.service.listAssessments(id, req.user);
  }

  // Parecer em lote para a turma (equipe — service valida)
  @Post('classes/:id/assessments')
  @PlanResource('catechesisClass')
  upsertAssessmentsBatch(
    @Param('id') id: string,
    @Body() dto: { period: string; rating?: string; notes: string; enrollmentIds: string[] },
    @Request() req: any,
  ) {
    return this.service.upsertAssessmentsBatch(id, dto, req.user);
  }

  // Taxa de material (coordenação registra; equipe consulta)
  @Post('classes/:id/fees')
  @PlanResource('catechesisClass')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  createFee(
    @Param('id') id: string,
    @Body() dto: { description: string; amount: number; dueDate?: string },
    @Request() req: any,
  ) {
    return this.service.createFee(id, dto, req.user);
  }

  @Get('classes/:id/fees')
  @PlanResource('catechesisClass')
  classFees(@Param('id') id: string, @Request() req: any) {
    return this.service.getClassFees(id, req.user);
  }

  @Post('fees/:id/payments')
  @PlanResource('catechesisFee')
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
  @PlanResource('catechesisEnrollment')
  listMessages(@Param('id') id: string, @Request() req: any) {
    return this.service.listMessages(id, req.user);
  }

  @Post('enrollments/:id/messages')
  @PlanResource('catechesisEnrollment')
  sendMessage(@Param('id') id: string, @Body() body: { body: string }, @Request() req: any) {
    return this.service.sendMessage(id, body?.body, req.user);
  }

  @Get('classes/:id/conversations')
  @PlanResource('catechesisClass')
  classConversations(@Param('id') id: string, @Request() req: any) {
    return this.service.listClassConversations(id, req.user);
  }

  // Recibo do pagamento da taxa (família ou equipe — service valida)
  @Get('fees/payments/:id/receipt.pdf')
  @PlanResource('catechesisFeePayment')
  async feeReceipt(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
    const buffer = await this.service.generateFeeReceipt(id, req.user);
    this.sendPdf(res, buffer, 'recibo-taxa.pdf');
  }

  // Exportação financeira das taxas da turma (CSV)
  @Get('classes/:id/fees/export.csv')
  @PlanResource('catechesisClass')
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
  @PlanResource('catechesisClass')
  updateTopics(
    @Param('id') id: string,
    @Body() body: { items: Array<{ sessionId: string; topic: string }> },
    @Request() req: any,
  ) {
    return this.service.updateSessionTopics(id, body?.items, req.user);
  }

  // Histórico de avisos enviados às famílias (equipe — service valida)
  @Get('classes/:id/sent-notices')
  @PlanResource('catechesisClass')
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
  @PlanResource('catechesisClass')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  renewalPreview(@Param('id') id: string, @Request() req: any) {
    return this.service.renewalPreview(id, req.user);
  }

  @Post('classes/:id/renew')
  @PlanResource('catechesisClass')
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
  @PlanResource('catechesisClass')
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

  // Turmas — o coordenador da pastoral de catequese cria e edita as turmas
  // da própria comunidade (o service valida o escopo)
  @Post('classes')
  @Roles(UserRole.PASTORAL_COORDINATOR)
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
  // é quem opera o encerramento (painel/concluir/distribuir são dela)
  @Post('classes/:id/rollover')
  @PlanResource('catechesisClass')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  rolloverClass(
    @Param('id') id: string,
    @Body() dto: { year?: number; name?: string; weekday?: number | null; time?: string | null; room?: string | null; capacity?: number | null; catechistMemberIds?: string[] },
    @Request() req: any,
  ) {
    return this.service.rolloverClass(id, dto, req.user);
  }

  // Padrão da janela de inscrições por comunidade/ano: turmas novas do ano
  // nascem com ele (ajustáveis depois)
  @Get('enrollment-presets')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  listEnrollmentPresets(@Request() req: any, @Query('communityId') communityId?: string) {
    return this.service.listEnrollmentPresets(req.user, communityId || undefined);
  }

  @Put('enrollment-presets')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  upsertEnrollmentPreset(
    @Body() dto: {
      communityId?: string;
      year: number;
      stageId?: string | null;
      enrollmentOpen?: boolean | null;
      enrollmentOpensAt?: string | null;
      enrollmentClosesAt?: string | null;
      fullBehavior?: string | null;
      capacity?: number | null;
      /** Também aplica os mesmos ajustes às turmas já existentes do ano */
      applyToExisting?: boolean;
      onlyWithoutCapacity?: boolean;
    },
    @Request() req: any,
  ) {
    return this.service.upsertEnrollmentPreset(dto, req.user);
  }

  @Delete('enrollment-presets/:id')
  @PlanResource('catechesisPreset')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  deleteEnrollmentPreset(@Param('id') id: string, @Request() req: any) {
    return this.service.deleteEnrollmentPreset(id, req.user);
  }

  // Janela de inscrições (e vagas) de TODAS as turmas de um ano/comunidade de
  // uma vez — declarado antes de `classes/:id` para a rota literal vencer
  @Patch('classes/enrollment-window')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  setEnrollmentWindow(
    @Body() dto: {
      communityId?: string;
      year: number;
      stageId?: string | null;
      enrollmentOpen?: boolean;
      enrollmentOpensAt?: string | null;
      enrollmentClosesAt?: string | null;
      fullBehavior?: string;
      capacity?: number | null;
      /** Vagas = matriculados atuais de cada turma (congela no tamanho de hoje) */
      capacityFromOccupied?: boolean;
      onlyWithoutCapacity?: boolean;
    },
    @Request() req: any,
  ) {
    return this.service.setEnrollmentWindow(dto, req.user);
  }

  // Editar a turma (inclui o limite de vagas e a janela de inscrições) —
  // coordenador de pastoral (Catequese) também, dentro do escopo da comunidade
  @Patch('classes/:id')
  @PlanResource('catechesisClass')
  @Roles(UserRole.PASTORAL_COORDINATOR)
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
  @PlanResource('catechesisClass')
  classReport(@Param('id') id: string, @Request() req: any) {
    return this.service.getClassReport(id, req.user);
  }

  @Get('classes/:id/sessions')
  @PlanResource('catechesisClass')
  listSessions(@Param('id') id: string, @Request() req: any) {
    return this.service.listSessions(id, req.user);
  }

  @Get('sessions/:id/attendance')
  @PlanResource('catechesisSession')
  sessionAttendance(@Param('id') id: string, @Request() req: any) {
    return this.service.getSessionAttendance(id, req.user);
  }

  @Get('classes/:id/eligible-catechists')
  @PlanResource('catechesisClass')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  eligibleCatechists(@Param('id') id: string, @Request() req: any) {
    return this.service.listEligibleCatechists(id, req.user);
  }

  @Post('classes/:id/catechists')
  @PlanResource('catechesisClass')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  addCatechist(@Param('id') id: string, @Body() body: { memberId: string; role?: string }, @Request() req: any) {
    return this.service.addCatechist(id, body.memberId, body.role, req.user);
  }

  @Delete('classes/:id/catechists/:memberId')
  @PlanResource('catechesisClass')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  removeCatechist(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req: any) {
    return this.service.removeCatechist(id, memberId, req.user);
  }

  // Matrícula
  @Post('enrollments')
  @PlanResource('catechesisClass:body.classId')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  enroll(
    @Body() dto: { classId: string; memberId: string; pendingDocuments?: string; requireBaptism?: boolean; overrideCapacity?: boolean; unbaptized?: boolean },
    @Request() req: any,
  ) {
    return this.service.enroll(dto, req.user);
  }

  @Patch('enrollments/:id/transfer')
  @PlanResource('catechesisEnrollment')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  transfer(@Param('id') id: string, @Body() body: { targetClassId: string }, @Request() req: any) {
    return this.service.transferEnrollment(id, body.targetClassId, req.user);
  }

  @Patch('enrollments/:id/documents')
  @PlanResource('catechesisEnrollment')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  updateDocuments(
    @Param('id') id: string,
    @Body() body: { pendingDocuments?: string | null },
    @Request() req: any,
  ) {
    return this.service.updateEnrollmentDocuments(id, body.pendingDocuments ?? null, req.user);
  }

  @Patch('enrollments/:id/complete')
  @PlanResource('catechesisEnrollment')
  @Roles(UserRole.PASTORAL_COORDINATOR)
  complete(@Param('id') id: string, @Body() dto: { date?: string; minister?: string }, @Request() req: any) {
    return this.service.completeEnrollment(id, dto, req.user);
  }

  // Encontros e chamada — catequista da turma OU escopo de gestão (service valida)
  @Post('classes/:id/sessions')
  @PlanResource('catechesisClass')
  createSession(@Param('id') id: string, @Body() dto: { date: string; topic?: string }, @Request() req: any) {
    return this.service.createSession(id, dto, req.user);
  }

  // Mensagem do catequista/coordenação para as famílias da turma
  @Post('classes/:id/notify')
  @PlanResource('catechesisClass')
  notifyFamilies(@Param('id') id: string, @Body() body: { message: string }, @Request() req: any) {
    return this.service.notifyClassFamilies(id, body?.message ?? '', req.user);
  }

  @Post('sessions/:id/attendance')
  @PlanResource('catechesisSession')
  markAttendance(
    @Param('id') id: string,
    @Body() body: { entries: Array<{ enrollmentId: string; present: boolean; late?: boolean; justified?: boolean; clear?: boolean }> },
    @Request() req: any,
  ) {
    return this.service.markAttendance(id, body.entries, req.user);
  }

  // Folha de presença (alunos × encontros) — equipe da turma (service valida)
  @Get('classes/:id/attendance-grid')
  @PlanResource('catechesisClass')
  attendanceGrid(@Param('id') id: string, @Request() req: any) {
    return this.service.getAttendanceGrid(id, req.user);
  }

  // Atestado da falta justificada
  @Post('sessions/:sessionId/attendance/:enrollmentId/certificate')
  @PlanResource('catechesisSession:params.sessionId')
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
  @PlanResource('catechesisSession:params.sessionId')
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
  @PlanResource('catechesisSession:params.sessionId')
  removeAbsenceCertificate(
    @Param('sessionId') sessionId: string,
    @Param('enrollmentId') enrollmentId: string,
    @Request() req: any,
  ) {
    return this.service.removeAbsenceCertificate(sessionId, enrollmentId, req.user);
  }
}
