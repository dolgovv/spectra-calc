import { Logger } from '@nestjs/common';

// Services log expected failures on purpose; keep them out of the test report.
Logger.overrideLogger(false);
