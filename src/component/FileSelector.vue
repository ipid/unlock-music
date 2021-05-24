<template>
    <el-upload
        :auto-upload="false"
        :on-change="addFile"
        :show-file-list="false"
        action=""
        drag
        multiple>
        <i class="el-icon-upload"/>
        <div class="el-upload__text">将文件拖到此处，或<em>点击选择</em></div>
        <div slot="tip" class="el-upload__tip">本工具仅在浏览器内对文件进行解锁，无需消耗流量</div>
        <transition name="el-fade-in"><!--todo: add delay to animation-->
            <el-progress
                v-show="progress_show" :format="progress_string" :percentage="progress_value"
                :stroke-width="16" :text-inside="true"
                style="margin: 16px 6px 0 6px"
            ></el-progress>
        </transition>
    </el-upload>
</template>

<script>
import {spawn, Worker, Pool} from "threads"
import {CommonDecrypt} from "@/decrypt/common.ts";
import {DecryptQueue} from "@/utils/utils";

export default {
    name: "FileSelector",
    data() {
        return {
            task_all: 0,
            task_finished: 0,
            queue: new DecryptQueue() // for http or file protocol
        }
    },
    computed: {
        progress_value() {
            return this.task_all ? this.task_finished / this.task_all * 100 : 0
        },
        progress_show() {
            return this.task_all !== this.task_finished
        }
    },
    mounted() {
        if (window.Worker && process.env.NODE_ENV === 'production') {
            console.log("Using Worker Pool")
            this.queue = Pool(
                () => spawn(new Worker('@/utils/worker.ts')),
                navigator.hardwareConcurrency || 1
            )
        } else {
            console.log("Using Queue in Main Thread")
        }
    },
    methods: {
        progress_string() {
            return `${this.task_finished} / ${this.task_all}`
        },
        async addFile(file) {
            this.task_all++
            this.queue.queue(async (dec = CommonDecrypt) => {
                console.log("start handling", file.name)
                try {
                    this.$emit("success", await dec(file));
                } catch (e) {
                    console.error(e)
                    this.$emit("error", e, file.name)
                } finally {
                    this.task_finished++
                }
            })
        },
    }
}

</script>

