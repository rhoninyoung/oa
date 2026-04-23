import { Controller, Get, Param, Headers, UnauthorizedException, ForbiddenException, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('exports')
export class ExportsController {
  // Stub: returns a minimal xlsx-like buffer (real impl later)
  @Get('iterations/:id.xlsx')
  async exportXlsx(
    @Param('id') _id: string,
    @Headers('x-user-id') userId: string,
    @Res() res: Response,
  ) {
    if (!userId) throw new UnauthorizedException();
    // TODO: real xlsx generation
    const buf = Buffer.from('PK\x03\x04placeholder-xlsx');
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="export.xlsx"`,
    });
    res.end(buf);
  }
}
