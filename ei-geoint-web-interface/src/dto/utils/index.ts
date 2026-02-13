import { IsNotEmpty, IsString } from 'class-validator'

export class ExampleUtilsDtoIn {
  @IsString()
  @IsNotEmpty()
  value: string
}
