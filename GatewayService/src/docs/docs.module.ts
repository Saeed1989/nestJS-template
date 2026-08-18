import { Module } from '@nestjs/common';
import { DocsAggregatorService } from './docs-aggregator.service';

@Module({
  providers: [DocsAggregatorService],
  exports: [DocsAggregatorService],
})
export class DocsModule {}
