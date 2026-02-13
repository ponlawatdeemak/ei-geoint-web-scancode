import { IsNotEmpty, IsString } from 'class-validator'

export class ExampleUmDtoIn {
  @IsString()
  @IsNotEmpty()
  value: string
}
