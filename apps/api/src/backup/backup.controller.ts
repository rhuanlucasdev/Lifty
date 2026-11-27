import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { toLocalDate } from '@lifty/shared';
import { BackupService } from './backup.service.js';

const MAX_BACKUP_BYTES = 500 * 1024 * 1024;

@Controller('backup')
export class BackupController {
  constructor(private readonly backup: BackupService) {}

  @Get()
  async download(): Promise<StreamableFile> {
    return new StreamableFile(await this.backup.export(), {
      type: 'application/vnd.sqlite3',
      disposition: `attachment; filename="lifty-${toLocalDate(new Date())}.db"`,
    });
  }

  @Post('restore')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BACKUP_BYTES, files: 1 } }))
  restore(@UploadedFile() file: { buffer: Buffer } | undefined) {
    if (!file) throw new BadRequestException('Envie o arquivo de backup no campo "file"');
    return this.backup.restore(file.buffer);
  }
}
