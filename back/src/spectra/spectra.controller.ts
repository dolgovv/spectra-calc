import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SpectraService } from "./spectra.service";
import { CalculateDto } from "./dto/calculate.dto";

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB - real archives are ~9 MB

@Controller("api")
export class SpectraController {
  constructor(private readonly spectra: SpectraService) {}

  @Post("calculate")
  @UseInterceptors(
    FileInterceptor("archive", { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async calculate(
    @UploadedFile() archive: Express.Multer.File | undefined,
    @Body() body: CalculateDto,
  ) {
    if (!archive) {
      throw new BadRequestException('Не приложен ZIP-архив (поле "archive")');
    }
    if (!/\.zip$/i.test(archive.originalname)) {
      throw new BadRequestException("Ожидается .zip архив");
    }

    const filename = decodeUploadName(archive.originalname);
    return this.spectra.calculate({
      buffer: archive.buffer,
      interval: { from: body.from, to: body.to },
      sourceFileName: filename,
      spatialStepMicrons: body.step,
    });
  }
}

/** Multer decodes multipart filenames as latin1; restore UTF-8 for Cyrillic names. */
function decodeUploadName(name: string): string {
  return Buffer.from(name, "latin1").toString("utf-8");
}
