import { IsNotEmpty, IsString } from 'class-validator'

export class ExampleSarDtoIn {
  @IsString()
  @IsNotEmpty()
  value: string
}
