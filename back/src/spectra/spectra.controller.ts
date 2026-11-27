import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { SpectraService } from "./spectra.service";
import { CalculateDto } from "./dto/calculate.dto";
import { CalculationLogService } from "../analytics/calculation-log.service";
import { clientIp, userAgent } from "../analytics/client-info";

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB - real archives are ~9 MB

@Controller("api")
export class SpectraController {
  constructor(
    private readonly spectra: SpectraService,
    private readonly calculationLog: CalculationLogService,
  ) {}

  @Post("calculate")
  @UseInterceptors(
    FileInterceptor("archive", { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async calculate(
    @UploadedFile() archive: Express.Multer.File | undefined,
    @Body() body: CalculateDto,
    @Req() req: Request,
  ) {
    if (!archive) {
      throw new BadRequestException('Не приложен ZIP-архив (поле "archive")');
    }
    if (!/\.zip$/i.test(archive.originalname)) {
      throw new BadRequestException("Ожидается .zip архив");
    }

    const filename = decodeUploadName(archive.originalname);
    const params = {
      from: body.from,
      to: body.to,
      step: body.step,
      colorLow: body.colorLow,
      colorMidLow: body.colorMidLow,
      colorMidHigh: body.colorMidHigh,
      colorHigh: body.colorHigh,
    };

    // Every attempt with an archive is recorded, failures included: those are the archives
    // worth looking at later.
    const id = randomUUID();
    const start = process.hrtime.bigint();
    const elapsedMs = () => Number(process.hrtime.bigint() - start) / 1e6;
    this.calculationLog.start({
      id,
      ip: clientIp(req),
      userAgent: userAgent(req),
      fileName: filename,
      fileBytes: archive.size,
      params,
    });
    const archiveSaved = this.calculationLog.saveArchive(id, archive.buffer);

    try {
      const result = await this.spectra.calculate({
        id,
        buffer: archive.buffer,
        interval: { from: params.from, to: params.to },
        sourceFileName: filename,
        spatialStepMicrons: params.step,
        colorLow: params.colorLow,
        colorMidLow: params.colorMidLow,
        colorMidHigh: params.colorMidHigh,
        colorHigh: params.colorHigh,
      });
      this.calculationLog.succeed(id, result, elapsedMs());
      return result;
    } catch (err) {
      this.calculationLog.fail(id, err, elapsedMs());
      throw err;
    } finally {
      // Never rejects; awaited so the archive is on disk by the time the client has its answer.
      await archiveSaved;
    }
  }
}

/** Multer decodes multipart filenames as latin1; restore UTF-8 for Cyrillic names. */
function decodeUploadName(name: string): string {
  return Buffer.from(name, "latin1").toString("utf-8");
}
