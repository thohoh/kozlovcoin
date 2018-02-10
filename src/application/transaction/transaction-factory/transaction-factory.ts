import { Component } from '@nestjs/common';
import { TransactionInput } from '../classes/transaction-input';
import { TransactionOutput } from '../classes/transaction-output';
import { Transaction } from '../classes/transaction';
import { TransactionUtilsService } from '../services/transaction-utils.service';
import { ICreateTransactionParams } from './create-transaction-params.interface';
import { UnspentTransactionOutput } from '../classes/unspent-transaction-output';
import { UnspentTransactionOutputsUtilsService } from '../../unspent-transaction-outputs/unspent-transaction-outputs-utils.service';
import { TransactionValidationService } from '../services/transaction-validation-service';

@Component()
export class TransactionFactory {
    constructor(
        private utils: TransactionUtilsService,
        private uTxOutsUtils: UnspentTransactionOutputsUtilsService,
        private validationService: TransactionValidationService
    ) {

    }

    public createCoinbase(publicAddress, coinbaseAmount, blockIndex: number): Transaction {
        const genesisInputTransaction = new TransactionInput('', blockIndex, '');
        const genesisOutputTransaction = new TransactionOutput(publicAddress, coinbaseAmount);

        const tx = new Transaction('', [genesisInputTransaction], [genesisOutputTransaction]);

        tx.id = this.utils.calcTransactionId(tx);

        return tx;
    }

    public async create(params: ICreateTransactionParams): Promise<Transaction> {
        if (!this.validationService.validateCreateParameters(params)) {
            throw new Error('Provided data for creating new transaction is not valid');
        }

        let senderUTxOuts: UnspentTransactionOutput[] = this.utils
            .getUTxOutsForAddress(params.senderPublicKey, params.uTxOuts);

        senderUTxOuts = this.uTxOutsUtils.updateUTxOutsWithNewTxs(senderUTxOuts, params.txPool); // todo the only usage of the foreighn module

        if (senderUTxOuts.length === 0) {
            throw new Error(`Error while creating a new transaction: Sender doesn't have any coins`);
        }

        const uTxOutsMatchingAmount = this.utils.findUTxOutsForAmount(senderUTxOuts, params.amount);

        if (uTxOutsMatchingAmount.length === 0) {
            throw new Error(`Error while creating a new transaction: Sender doesn't have enough coins`);
        }

        const leftOverAmount: number = this.utils.getLeftOverAmount(uTxOutsMatchingAmount, params.amount);

        const inputs: TransactionInput[] = this.utils.convertUTxOutsToUnsignedTxInputs(uTxOutsMatchingAmount);

        const outputs: TransactionOutput[] = this.createTxOutsForNewTransaction(
            params.senderPublicKey,
            params.recipientPublicKey,
            params.amount,
            leftOverAmount
        );

        const newTransaction = new Transaction('', inputs, outputs);
        newTransaction.id = this.utils.calcTransactionId(newTransaction);

        this.utils.signTxInputs(newTransaction, params.senderPrivateKey, params.uTxOuts);

        const txValid: boolean = this.validationService.validateTxInputs(newTransaction, params.uTxOuts);
        if (!txValid) {
            throw new Error(`Create new transaction Error: Not valid`);
        }

        return newTransaction;
    }

    private createTxOutsForNewTransaction(senderAddress: string, recipientAddress: string, amount: number, leftOverAmount): TransactionOutput[]  {
        const outputs = [];

        if (leftOverAmount > 0) {
            outputs.push(new TransactionOutput(senderAddress, leftOverAmount));
        }

        outputs.push(new TransactionOutput(recipientAddress, amount));

        return outputs;
    }
}