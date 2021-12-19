<template>
  <el-dialog fullscreen @close="cancel()" title="解密设定" :visible="show" width="30%" center>
    <el-form ref="form" :model="form" label-width="80px">
      <el-form-item label="Joox UUID">
        <el-input type="text" placeholder="UUID" v-model="form.jooxUUID" clearable maxlength="32" show-word-limit>
        </el-input>
      </el-form-item>
    </el-form>
    <span slot="footer" class="dialog-footer">
      <el-button type="primary" :loading="saving" @click="emitConfirm()">确 定</el-button>
    </span>
  </el-dialog>
</template>

<script>
import storage from '../utils/storage';

export default {
  components: {},
  props: {
    show: { type: Boolean, required: true },
  },
  data() {
    return {
      saving: false,
      form: {
        jooxUUID: '',
      },
      centerDialogVisible: false,
    };
  },
  async mounted() {
    await this.resetForm();
  },
  methods: {
    async resetForm() {
      this.form.jooxUUID = await storage.loadJooxUUID();
    },

    async cancel() {
      await this.resetForm();
      this.$emit('done');
    },

    async emitConfirm() {
      this.saving = true;
      await storage.saveJooxUUID(this.form.jooxUUID);
      this.saving = false;
      this.$emit('done');
    },
  },
};
</script>
