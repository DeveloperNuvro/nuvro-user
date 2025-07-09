import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import InputBox from "../inputbox/InputBox";
import CustomSelect from "../select/CustomSelect";
import CustomTextarea from "../textArea/CustomTextarea";
import { ButtonExtraSmall } from "../button/Button";
import ChatInbox from "../chatbotInbox/ChatInbox";
import toast from "react-hot-toast";

import { useDispatch } from "react-redux";
import { createAIAgent } from "../../../features/aiAgent/aiAgentSlice";

import { useEffect } from "react";
import { fetchAiModelsByBusinessId } from "@/features/aiModel/trainModelSlice"; // adjust path if needed
import { RootState, AppDispatch } from "../../../app/store";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const MAX_TEMPLATES = 5;

const agentSchema = z.object({
  name: z.string().min(2, "Agent name is required"),
  aiModel: z.string().nonempty("Select a model"),
  tone: z.enum(["friendly", "formal", "neutral"]),
  instruction: z.string().min(5, "Instruction must be at least 5 characters"),
  responseTemplates: z
    .array(
      z.object({
        question: z.string().min(1, "Question is required"),
        answer: z.string().min(1, "Answer is required"),
      })
    )
    .max(MAX_TEMPLATES, `Maximum ${MAX_TEMPLATES} templates allowed`),
});

type AgentFormData = z.infer<typeof agentSchema>;

export default function CreateAiAgent() {
  const dispatch = useDispatch<AppDispatch>();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      aiModel: "",
      tone: "friendly",
      instruction: "",
      responseTemplates: [{ question: "", answer: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "responseTemplates",
  });


  const { aiModels } = useSelector((state: RootState) => state.trainModel);
  const {status} = useSelector((state: RootState) => state.aiAgent);
  

  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchAiModelsByBusinessId());
  }, [dispatch]);

  const onSubmit = async (data: AgentFormData) => {
    try {
      const formattedData = {
        ...data,
        aiModel: data.aiModel,
        responseTemplates: data.responseTemplates.map(
          (template) => `${template.question}: ${template.answer}`
        ),
      };
      const res: any = await dispatch(createAIAgent(formattedData)).unwrap();
      toast.success(res.message || 'Agent created successfully!');
       
      navigate('/main-menu/ai-agent/setup');


    } catch (err: any) {
      toast.error(`❌ ${err}`);
    }
  };

  return (
    <div className="w-full h-full px-6 md:px-16 pt-12 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-16">
      {/* Form Panel */}
      <div>
        <h2 className="text-2xl font-semibold mb-6 text-foreground">Agent Information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <InputBox label="Agent Name" {...register("name")} error={errors.name?.message} />

          <CustomSelect
            {...register("aiModel")}
            options={aiModels.map((model) => ({
              label: model.name,
              value: model._id,
            }))}
            text="Select a model"
            error={errors.aiModel?.message}
          />

          <CustomSelect
            text="Select a tone"
            {...register("tone")}
            options={[
              { value: "friendly", label: "Friendly" },
              { value: "formal", label: "Formal" },
              { value: "neutral", label: "Neutral" },
            ]}
            error={errors.tone?.message}
          />

          <CustomTextarea
            {...register("instruction")}
            placeholder="Instruction"
            error={errors.instruction?.message}
          />

          {/* Response Templates */}
          <div className="space-y-2 mt-4">
            <label className="text-2xl font-semibold mb-6 text-foreground">Default Q&A Responses</label>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-2  rounded-md relative mt-3"
              >
                <div className="text-sm font-medium  mb-1">
                  Template #{index + 1}
                </div>

                <InputBox
                  label="Question"
                  {...register(`responseTemplates.${index}.question`)}
                  error={errors.responseTemplates?.[index]?.question?.message}
                  placeholder="e.g., What is your return policy?"
                />
                <CustomTextarea
                  placeholder="Answer"
                  {...register(`responseTemplates.${index}.answer`)}
                  error={errors.responseTemplates?.[index]?.answer?.message}
                />

                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-400 cursor-pointer text-xs mt-2"
                >
                  Remove Template
                </button>
              </div>
            ))}

            {fields.length < MAX_TEMPLATES && (
              <button
                type="button"
                onClick={() => append({ question: "", answer: "" })}
                className="text-sm text-[#ff21b0] cursor-pointer hover:underline mt-5"
              >
                <span className="ml-2 font-bold">+ Add another Q&A</span>
              </button>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-2 md:mr-[130px]">
            <ButtonExtraSmall value="Cancel" type="reset" isOutline />
            <ButtonExtraSmall type="submit" disabled={status === 'loading'} value={`${status === 'loading' ? 'Creating...' : 'Create Agent'}`} />
          </div>
        </form>
      </div>

      {/* Preview Panel */}
      <div className="h-[500px] xl:flex hidden justify-center items-start">
        <ChatInbox agentName="Nuvro AI Agent" setOpen={true} />
      </div>
    </div>
  );
}
