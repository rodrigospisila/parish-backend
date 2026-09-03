-- Tick de entrega: carimbado quando a notificação da mensagem foi criada
-- para o outro lado da conversa (leitura continua em readAt)
ALTER TABLE "catechesis_messages" ADD COLUMN "deliveredAt" TIMESTAMP(3);
