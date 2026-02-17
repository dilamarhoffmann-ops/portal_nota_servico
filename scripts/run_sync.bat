
@echo off
echo Iniciando sincronizacao de notas (TypeScript): %date% %time%
cd /d "c:\Users\SR APOIO\OneDrive\Documents\Projetos IA\portal-de-notas-de-serviço"
npm run sync
echo Finalizado: %date% %time%
